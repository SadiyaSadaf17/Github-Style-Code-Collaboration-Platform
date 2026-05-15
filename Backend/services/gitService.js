import fs from 'fs';
import path from 'path';
import { git, fs as gitFs } from 'isomorphic-git';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GitService {
  constructor() {
    this.reposDir = path.join(__dirname, '../../git-repos');
    this.ensureReposDir();
  }

  ensureReposDir() {
    if (!fs.existsSync(this.reposDir)) {
      fs.mkdirSync(this.reposDir, { recursive: true });
    }
  }

  getRepoPath(repoId) {
    return path.join(this.reposDir, repoId.toString());
  }

  async initRepository(repoId, options = {}) {
    const repoPath = this.getRepoPath(repoId);

    try {
      // Create repository directory
      if (!fs.existsSync(repoPath)) {
        fs.mkdirSync(repoPath, { recursive: true });
      }

      // Initialize git repository
      await git.init({
        fs: fs,
        dir: repoPath,
        defaultBranch: options.defaultBranch || 'main'
      });

      // Create initial commit if requested
      if (options.initialCommit) {
        const { author, message } = options.initialCommit;

        // Create README.md
        const readmePath = path.join(repoPath, 'README.md');
        fs.writeFileSync(readmePath, '# New Repository\n\nThis is a new repository.');

        // Add and commit
        await git.add({
          fs: fs,
          dir: repoPath,
          filepath: 'README.md'
        });

        await git.commit({
          fs: fs,
          dir: repoPath,
          message: message || 'Initial commit',
          author: {
            name: author.name,
            email: author.email
          }
        });
      }

      return { success: true, repoPath };
    } catch (error) {
      console.error('Error initializing repository:', error);
      throw new Error(`Failed to initialize repository: ${error.message}`);
    }
  }

  async createCommit(repoId, authorId, message, files, author) {
    const repoPath = this.getRepoPath(repoId);

    try {
      // Ensure repository exists
      if (!fs.existsSync(path.join(repoPath, '.git'))) {
        throw new Error('Repository not initialized');
      }

      // Write files to repository
      for (const file of files) {
        const filePath = path.join(repoPath, file.filename);
        const dirPath = path.dirname(filePath);

        // Ensure directory exists
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }

        // Write file content
        fs.writeFileSync(filePath, file.content || '');
      }

      // Add all files
      await git.add({
        fs: fs,
        dir: repoPath,
        filepath: '.'
      });

      // Create commit
      const sha = await git.commit({
        fs: fs,
        dir: repoPath,
        message,
        author: {
          name: author.name,
          email: author.email
        }
      });

      // Get commit details
      const commit = await git.readCommit({
        fs: fs,
        dir: repoPath,
        oid: sha
      });

      return {
        sha,
        message,
        author: commit.commit.author,
        committer: commit.commit.committer,
        tree: commit.commit.tree,
        parents: commit.commit.parent,
        files: files.map(f => ({
          filename: f.filename,
          status: 'added',
          additions: f.content ? f.content.split('\n').length : 0,
          deletions: 0
        }))
      };
    } catch (error) {
      console.error('Error creating commit:', error);
      throw new Error(`Failed to create commit: ${error.message}`);
    }
  }

  async getFileContent(repoId, filePath, ref = 'main') {
    const repoPath = this.getRepoPath(repoId);

    try {
      const content = await git.readBlob({
        fs: fs,
        dir: repoPath,
        oid: ref,
        filepath: filePath
      });

      return content.blob.toString('utf8');
    } catch (error) {
      console.error('Error reading file:', error);
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  async updateFile(repoId, filePath, content, author, message, ref = 'main') {
    const repoPath = this.getRepoPath(repoId);

    try {
      // Get current file content for diff
      let oldContent = '';
      try {
        oldContent = await this.getFileContent(repoId, filePath, ref);
      } catch (e) {
        // File doesn't exist, that's fine for new files
      }

      // Write new content
      const fullPath = path.join(repoPath, filePath);
      const dirPath = path.dirname(fullPath);

      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      fs.writeFileSync(fullPath, content);

      // Add file
      await git.add({
        fs: fs,
        dir: repoPath,
        filepath: filePath
      });

      // Commit
      const sha = await git.commit({
        fs: fs,
        dir: repoPath,
        message: message || `Update ${filePath}`,
        author: {
          name: author.name,
          email: author.email
        }
      });

      // Calculate diff stats
      const oldLines = oldContent.split('\n').length;
      const newLines = content.split('\n').length;
      const additions = Math.max(0, newLines - oldLines);
      const deletions = Math.max(0, oldLines - newLines);

      return {
        sha,
        filePath,
        additions,
        deletions,
        changes: additions + deletions
      };
    } catch (error) {
      console.error('Error updating file:', error);
      throw new Error(`Failed to update file: ${error.message}`);
    }
  }

  async getCommitHistory(repoId, ref = 'main', limit = 50) {
    const repoPath = this.getRepoPath(repoId);

    try {
      const commits = await git.log({
        fs: fs,
        dir: repoPath,
        ref,
        depth: limit
      });

      return commits.map(commit => ({
        sha: commit.oid,
        message: commit.commit.message,
        author: commit.commit.author,
        committer: commit.commit.committer,
        tree: commit.commit.tree,
        parents: commit.commit.parent
      }));
    } catch (error) {
      console.error('Error getting commit history:', error);
      throw new Error(`Failed to get commit history: ${error.message}`);
    }
  }

  async createBranch(repoId, branchName, sourceSha) {
    const repoPath = this.getRepoPath(repoId);

    try {
      await git.branch({
        fs: fs,
        dir: repoPath,
        ref: branchName,
        object: sourceSha
      });

      return { success: true, branchName };
    } catch (error) {
      console.error('Error creating branch:', error);
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  async getBranches(repoId) {
    const repoPath = this.getRepoPath(repoId);

    try {
      const branches = await git.listBranches({
        fs: fs,
        dir: repoPath
      });

      const branchDetails = [];

      for (const branch of branches) {
        try {
          const commit = await git.resolveRef({
            fs: fs,
            dir: repoPath,
            ref: branch
          });

          branchDetails.push({
            name: branch,
            sha: commit
          });
        } catch (e) {
          // Skip invalid branches
        }
      }

      return branchDetails;
    } catch (error) {
      console.error('Error getting branches:', error);
      throw new Error(`Failed to get branches: ${error.message}`);
    }
  }

  async getDiff(repoId, base, head) {
    const repoPath = this.getRepoPath(repoId);

    try {
      // This is a simplified diff - in production you'd want more sophisticated diffing
      const baseCommit = await git.readCommit({
        fs: fs,
        dir: repoPath,
        oid: base
      });

      const headCommit = await git.readCommit({
        fs: fs,
        dir: repoPath,
        oid: head
      });

      // For now, return basic diff info
      return {
        base: base,
        head: head,
        files: [] // Would need to implement proper diff logic
      };
    } catch (error) {
      console.error('Error getting diff:', error);
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }

  async deleteRepository(repoId) {
    const repoPath = this.getRepoPath(repoId);

    try {
      if (fs.existsSync(repoPath)) {
        fs.rmSync(repoPath, { recursive: true, force: true });
      }

      return { success: true };
    } catch (error) {
      console.error('Error deleting repository:', error);
      throw new Error(`Failed to delete repository: ${error.message}`);
    }
  }
}

export default new GitService();