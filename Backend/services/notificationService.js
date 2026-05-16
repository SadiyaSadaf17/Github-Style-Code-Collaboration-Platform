import nodemailer from 'nodemailer';
import { NotificationModel } from '../models/notificationModel.js';

class NotificationService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Create in-app notification
  async createNotification(data) {
    try {
      const notification = new NotificationModel(data);
      await notification.save();

      // Emit real-time notification via Socket.io (room key must match join-user id string)
      if (global.io && data.recipient != null) {
        const roomId =
          typeof data.recipient === "object" && data.recipient.toString
            ? data.recipient.toString()
            : String(data.recipient);
        global.io.to(`user:${roomId}`).emit("notification:new", {
          notification: notification.toObject(),
        });
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Send email notification
  async sendEmail(to, subject, html, text = '') {
    try {
      if (!process.env.SMTP_USER) {
        console.log('SMTP not configured, skipping email send');
        return;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', result.messageId);

      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      // Don't throw error for email failures - they shouldn't break the app
    }
  }

  // Notify on issue creation
  async notifyIssueCreated(issue, repository, actor) {
    try {
      // Notify repository collaborators
      const collaborators = repository.collaborators || [];

      for (const collaborator of collaborators) {
        if (collaborator.user.toString() !== actor._id.toString()) {
          await this.createNotification({
            recipient: collaborator.user,
            type: 'issue_opened',
            title: `New issue in ${repository.name}`,
            message: `${actor.name} opened issue "${issue.title}"`,
            repository: repository._id,
            issue: issue._id,
            actor: actor._id
          });

          // Send email if user has email notifications enabled
          // This would check user preferences
          await this.sendEmail(
            collaborator.user.email,
            `New issue in ${repository.name}`,
            `<p>${actor.name} opened a new issue: <strong>${issue.title}</strong></p>
             <p><a href="${process.env.FRONTEND_URL}/repos/${repository.fullName}/issues/${issue.number}">View Issue</a></p>`
          );
        }
      }
    } catch (error) {
      console.error('Error notifying issue creation:', error);
    }
  }

  // Notify on pull request creation
  async notifyPullRequestCreated(pullRequest, repository, actor) {
    try {
      const collaborators = repository.collaborators || [];

      for (const collaborator of collaborators) {
        if (collaborator.user.toString() !== actor._id.toString()) {
          await this.createNotification({
            recipient: collaborator.user,
            type: 'pr_opened',
            title: `New pull request in ${repository.name}`,
            message: `${actor.name} opened pull request "${pullRequest.title}"`,
            repository: repository._id,
            pullRequest: pullRequest._id,
            actor: actor._id
          });

          await this.sendEmail(
            collaborator.user.email,
            `New pull request in ${repository.name}`,
            `<p>${actor.name} opened a new pull request: <strong>${pullRequest.title}</strong></p>
             <p><a href="${process.env.FRONTEND_URL}/repos/${repository.fullName}/pull/${pullRequest.number}">View Pull Request</a></p>`
          );
        }
      }
    } catch (error) {
      console.error('Error notifying PR creation:', error);
    }
  }

  // Notify on comment creation
  async notifyCommentCreated(comment, repository, issue, pullRequest, actor) {
    try {
      // Get all users who have commented on this thread
      let existingParticipants = [];

      if (issue) {
        const existingComments = await Comment.find({
          issue: issue._id,
          author: { $ne: actor._id }
        }).populate('author');

        existingParticipants = existingComments.map(c => c.author);
      } else if (pullRequest) {
        const existingComments = await Comment.find({
          pullRequest: pullRequest._id,
          author: { $ne: actor._id }
        }).populate('author');

        existingParticipants = existingComments.map(c => c.author);
      }

      // Remove duplicates
      const uniqueParticipants = existingParticipants.filter(
        (user, index, self) => self.findIndex(u => u._id.toString() === user._id.toString()) === index
      );

      for (const participant of uniqueParticipants) {
        await this.createNotification({
          recipient: participant._id,
          type: 'comment_created',
          title: `New comment on ${issue ? 'issue' : 'pull request'}`,
          message: `${actor.name} commented on "${issue ? issue.title : pullRequest.title}"`,
          repository: repository._id,
          issue: issue?._id,
          pullRequest: pullRequest?._id,
          comment: comment._id,
          actor: actor._id
        });
      }
    } catch (error) {
      console.error('Error notifying comment creation:', error);
    }
  }

  // Notify on mention
  async notifyMention(mentionedUser, repository, issue, pullRequest, comment, actor) {
    try {
      const entity = issue || pullRequest;
      const entityType = issue ? 'issue' : 'pull request';

      await this.createNotification({
        recipient: mentionedUser._id,
        type: 'mention',
        title: `You were mentioned`,
        message: `${actor.name} mentioned you in ${entityType} "${entity.title}"`,
        repository: repository._id,
        issue: issue?._id,
        pullRequest: pullRequest?._id,
        comment: comment?._id,
        actor: actor._id
      });

      await this.sendEmail(
        mentionedUser.email,
        `You were mentioned in ${repository.name}`,
        `<p>${actor.name} mentioned you in ${entityType}: <strong>${entity.title}</strong></p>
         <p><a href="${process.env.FRONTEND_URL}/repos/${repository.fullName}/${issue ? 'issues' : 'pull'}/${entity.number}">View ${entityType}</a></p>`
      );
    } catch (error) {
      console.error('Error notifying mention:', error);
    }
  }

  // Notify on pull request review request
  async notifyReviewRequested(pullRequest, repository, reviewer, actor) {
    try {
      await this.createNotification({
        recipient: reviewer._id,
        type: 'pr_review_requested',
        title: `Review requested`,
        message: `${actor.name} requested your review on "${pullRequest.title}"`,
        repository: repository._id,
        pullRequest: pullRequest._id,
        actor: actor._id
      });

      await this.sendEmail(
        reviewer.email,
        `Review requested on ${repository.name}`,
        `<p>${actor.name} requested your review on pull request: <strong>${pullRequest.title}</strong></p>
         <p><a href="${process.env.FRONTEND_URL}/repos/${repository.fullName}/pull/${pullRequest.number}">Review Pull Request</a></p>`
      );
    } catch (error) {
      console.error('Error notifying review request:', error);
    }
  }

  // Mark notifications as read
  async markAsRead(userId, notificationIds) {
    try {
      await Notification.updateMany(
        {
          recipient: userId,
          _id: { $in: notificationIds },
          read: false
        },
        {
          read: true,
          readAt: new Date()
        }
      );

      return { success: true };
    } catch (error) {
      console.error('Error marking notifications as read:', error);
      throw error;
    }
  }

  // Get user notifications
  async getUserNotifications(userId, options = {}) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = options;

      const query = { recipient: userId };
      if (unreadOnly) {
        query.read = false;
      }

      const notifications = await Notification.find(query)
        .populate('repository', 'name fullName')
        .populate('actor', 'name username avatar')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(query);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  // Clean up old notifications (run as cron job)
  async cleanupOldNotifications(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true
      });

      console.log(`Cleaned up ${result.deletedCount} old notifications`);
      return result;
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      throw error;
    }
  }
}

export default new NotificationService();