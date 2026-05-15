import express from 'express';
import { Organization } from '../models/organizationModel.js';
import { UserTypeModel } from '../models/userModel.js';
import { authenticateToken, checkOrgPermission } from '../middlewares/rbac.js';

export const organizationRouter = express.Router();

// Create new organization
organizationRouter.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, login, description, website, email, location, avatar } = req.body;

    // Validate input
    if (!name || !login) {
      return res.status(400).json({ message: 'Name and login are required' });
    }

    // Check if organization already exists
    const existingOrg = await Organization.findOne({ login: login.toLowerCase() });
    if (existingOrg) {
      return res.status(400).json({ message: 'Organization login already exists' });
    }

    // Create organization
    const org = new Organization({
      name,
      login: login.toLowerCase(),
      description,
      website,
      email,
      location,
      avatar,
      owner: req.user.userId,
      members: [{
        user: req.user.userId,
        role: 'OWNER',
        addedAt: new Date()
      }]
    });

    await org.save();

    // Update user organizations
    await User.findByIdAndUpdate(
      req.user.userId,
      {
        $push: {
          organizations: {
            organization: org._id,
            role: 'OWNER'
          }
        }
      }
    );

    res.status(201).json({
      message: 'Organization created successfully',
      payload: org
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating organization', error: error.message });
  }
});

// Get all organizations (paginated)
organizationRouter.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orgs = await Organization.find()
      .skip(skip)
      .limit(limit)
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar');

    const total = await Organization.countDocuments();

    res.status(200).json({
      message: 'Organizations fetched successfully',
      payload: orgs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching organizations', error: error.message });
  }
});

// Get organization by login/id
organizationRouter.get('/:orgIdOrLogin', async (req, res) => {
  try {
    const { orgIdOrLogin } = req.params;

    let org = await Organization.findById(orgIdOrLogin)
      .populate('owner', 'username email avatar')
      .populate('members.user', 'username email avatar')
      .populate('teams', 'name description');

    // If not found by ID, try by login
    if (!org) {
      org = await Organization.findOne({ login: orgIdOrLogin.toLowerCase() })
        .populate('owner', 'username email avatar')
        .populate('members.user', 'username email avatar')
        .populate('teams', 'name description');
    }

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.status(200).json({
      message: 'Organization fetched successfully',
      payload: org
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching organization', error: error.message });
  }
});

// Update organization
organizationRouter.put('/:orgId', 
  authenticateToken, 
  checkOrgPermission('ADMIN'),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const updateData = req.body;

      // Prevent certain fields from being updated
      delete updateData.owner;
      delete updateData.members;
      delete updateData.teams;

      const org = await Organization.findByIdAndUpdate(
        orgId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      res.status(200).json({
        message: 'Organization updated successfully',
        payload: org
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating organization', error: error.message });
    }
  }
);

// Delete organization
organizationRouter.delete('/:orgId',
  authenticateToken,
  checkOrgPermission('OWNER'),
  async (req, res) => {
    try {
      const { orgId } = req.params;

      const org = await Organization.findByIdAndDelete(orgId);

      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      // Remove organization from all users
      await User.updateMany(
        { 'organizations.organization': orgId },
        { $pull: { organizations: { organization: orgId } } }
      );

      res.status(200).json({
        message: 'Organization deleted successfully',
        payload: org
      });
    } catch (error) {
      res.status(500).json({ message: 'Error deleting organization', error: error.message });
    }
  }
);

// Add member to organization
organizationRouter.post('/:orgId/members',
  authenticateToken,
  checkOrgPermission('ADMIN'),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { userId, role = 'MEMBER' } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'userId is required' });
      }

      // Check if user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if user is already a member
      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const isMember = org.members.some(m => m.user.toString() === userId);
      if (isMember) {
        return res.status(400).json({ message: 'User is already a member of this organization' });
      }

      // Add member
      org.members.push({
        user: userId,
        role: role.toUpperCase(),
        addedBy: req.user.userId,
        addedAt: new Date()
      });

      await org.save();

      // Update user
      await User.findByIdAndUpdate(userId, {
        $push: {
          organizations: {
            organization: orgId,
            role: role.toUpperCase()
          }
        }
      });

      res.status(200).json({
        message: 'Member added successfully',
        payload: org
      });
    } catch (error) {
      res.status(500).json({ message: 'Error adding member', error: error.message });
    }
  }
);

// Remove member from organization
organizationRouter.delete('/:orgId/members/:userId',
  authenticateToken,
  checkOrgPermission('ADMIN'),
  async (req, res) => {
    try {
      const { orgId, userId } = req.params;

      const org = await Organization.findByIdAndUpdate(
        orgId,
        { $pull: { members: { user: userId } } },
        { new: true }
      );

      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      // Update user
      await User.findByIdAndUpdate(userId, {
        $pull: { organizations: { organization: orgId } }
      });

      res.status(200).json({
        message: 'Member removed successfully',
        payload: org
      });
    } catch (error) {
      res.status(500).json({ message: 'Error removing member', error: error.message });
    }
  }
);

// Update member role
organizationRouter.patch('/:orgId/members/:userId',
  authenticateToken,
  checkOrgPermission('ADMIN'),
  async (req, res) => {
    try {
      const { orgId, userId } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ message: 'role is required' });
      }

      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ message: 'Organization not found' });
      }

      const member = org.members.find(m => m.user.toString() === userId);
      if (!member) {
        return res.status(404).json({ message: 'Member not found in organization' });
      }

      member.role = role.toUpperCase();
      await org.save();

      // Update user
      await User.findOneAndUpdate(
        { _id: userId, 'organizations.organization': orgId },
        { $set: { 'organizations.$.role': role.toUpperCase() } }
      );

      res.status(200).json({
        message: 'Member role updated successfully',
        payload: org
      });
    } catch (error) {
      res.status(500).json({ message: 'Error updating member role', error: error.message });
    }
  }
);

// Get organization members
organizationRouter.get('/:orgId/members', async (req, res) => {
  try {
    const { orgId } = req.params;

    const org = await Organization.findById(orgId)
      .populate('members.user', 'username email avatar');

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.status(200).json({
      message: 'Organization members fetched successfully',
      payload: org.members
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching members', error: error.message });
  }
});

// Get user organizations
organizationRouter.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('organizations.organization');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User organizations fetched successfully',
      payload: user.organizations
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user organizations', error: error.message });
  }
});

export default organizationRouter;