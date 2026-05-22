import express from "express";
import { Organization } from "../models/organizationModel.js";
import { UserTypeModel } from "../models/userModel.js";
import { authenticateToken, checkOrgPermission } from "../middlewares/rbac.js";

export const organizationRouter = express.Router();

function mapApiRoleToMemberRole(apiRole) {
  const r = String(apiRole || "MEMBER").toUpperCase();
  if (r === "ADMIN") return "admin";
  return "member";
}

function mapApiRoleToUserOrgRole(apiRole) {
  const r = String(apiRole || "MEMBER").toUpperCase();
  if (r === "OWNER") return "owner";
  if (r === "ADMIN") return "admin";
  return "member";
}

organizationRouter.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, login, description, website, email, location, avatar } = req.body;

    if (!name || !login) {
      return res.status(400).json({ message: "Name and login are required" });
    }

    const existingOrg = await Organization.findOne({ login: login.toLowerCase() });
    if (existingOrg) {
      return res.status(400).json({ message: "Organization login already exists" });
    }

    const org = new Organization({
      name,
      login: login.toLowerCase(),
      description,
      website,
      email,
      location,
      avatar,
      owners: [req.user.userId],
      members: [
        {
          user: req.user.userId,
          role: "admin",
          addedBy: req.user.userId,
          addedAt: new Date(),
        },
      ],
    });

    await org.save();

    await UserTypeModel.findByIdAndUpdate(req.user.userId, {
      $push: {
        organizations: {
          organization: org._id,
          role: "owner",
        },
      },
    });

    res.status(201).json({
      message: "Organization created successfully",
      payload: org,
    });
  } catch (error) {
    res.status(500).json({ message: "Error creating organization", error: error.message });
  }
});

organizationRouter.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const orgs = await Organization.find()
      .skip(skip)
      .limit(limit)
      .populate("owners", "username email avatar")
      .populate("members.user", "username email avatar");

    const total = await Organization.countDocuments();

    res.status(200).json({
      message: "Organizations fetched successfully",
      payload: orgs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching organizations", error: error.message });
  }
});

organizationRouter.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await UserTypeModel.findById(userId).populate("organizations.organization");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User organizations fetched successfully",
      payload: user.organizations,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching user organizations", error: error.message });
  }
});

organizationRouter.get("/:orgIdOrLogin", async (req, res) => {
  try {
    const { orgIdOrLogin } = req.params;

    let org = await Organization.findById(orgIdOrLogin)
      .populate("owners", "username email avatar")
      .populate("members.user", "username email avatar");

    if (!org) {
      org = await Organization.findOne({ login: orgIdOrLogin.toLowerCase() })
        .populate("owners", "username email avatar")
        .populate("members.user", "username email avatar");
    }

    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.status(200).json({
      message: "Organization fetched successfully",
      payload: org,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching organization", error: error.message });
  }
});

organizationRouter.put(
  "/:orgId",
  authenticateToken,
  checkOrgPermission("ADMIN"),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const updateData = { ...req.body };

      delete updateData.owners;
      delete updateData.members;
      delete updateData.teams;

      const org = await Organization.findByIdAndUpdate(orgId, updateData, {
        new: true,
        runValidators: true,
      });

      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      res.status(200).json({
        message: "Organization updated successfully",
        payload: org,
      });
    } catch (error) {
      res.status(500).json({ message: "Error updating organization", error: error.message });
    }
  }
);

organizationRouter.delete(
  "/:orgId",
  authenticateToken,
  checkOrgPermission("OWNER"),
  async (req, res) => {
    try {
      const { orgId } = req.params;

      const org = await Organization.findByIdAndDelete(orgId);

      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      await UserTypeModel.updateMany(
        { "organizations.organization": orgId },
        { $pull: { organizations: { organization: orgId } } }
      );

      res.status(200).json({
        message: "Organization deleted successfully",
        payload: org,
      });
    } catch (error) {
      res.status(500).json({ message: "Error deleting organization", error: error.message });
    }
  }
);

organizationRouter.post(
  "/:orgId/members",
  authenticateToken,
  checkOrgPermission("ADMIN"),
  async (req, res) => {
    try {
      const { orgId } = req.params;
      const { userId, role = "MEMBER" } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }

      const user = await UserTypeModel.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const isOwner = org.owners.some((id) => id.toString() === userId);
      const isMember = org.members.some((m) => m.user.toString() === userId);
      if (isOwner || isMember) {
        return res.status(400).json({ message: "User is already a member of this organization" });
      }

      const apiRole = String(role).toUpperCase();
      if (apiRole === "OWNER") {
        org.owners.push(userId);
      }

      org.members.push({
        user: userId,
        role: mapApiRoleToMemberRole(apiRole),
        addedBy: req.user.userId,
        addedAt: new Date(),
      });

      await org.save();

      await UserTypeModel.findByIdAndUpdate(userId, {
        $push: {
          organizations: {
            organization: orgId,
            role: mapApiRoleToUserOrgRole(apiRole),
          },
        },
      });

      res.status(200).json({
        message: "Member added successfully",
        payload: org,
      });
    } catch (error) {
      res.status(500).json({ message: "Error adding member", error: error.message });
    }
  }
);

organizationRouter.delete(
  "/:orgId/members/:userId",
  authenticateToken,
  checkOrgPermission("ADMIN"),
  async (req, res) => {
    try {
      const { orgId, userId } = req.params;

      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      org.members = org.members.filter((m) => m.user.toString() !== userId);
      org.owners = org.owners.filter((id) => id.toString() !== userId);
      await org.save();

      await UserTypeModel.findByIdAndUpdate(userId, {
        $pull: { organizations: { organization: orgId } },
      });

      res.status(200).json({
        message: "Member removed successfully",
        payload: org,
      });
    } catch (error) {
      res.status(500).json({ message: "Error removing member", error: error.message });
    }
  }
);

organizationRouter.patch(
  "/:orgId/members/:userId",
  authenticateToken,
  checkOrgPermission("ADMIN"),
  async (req, res) => {
    try {
      const { orgId, userId } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ message: "role is required" });
      }

      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const apiRole = String(role).toUpperCase();
      const member = org.members.find((m) => m.user.toString() === userId);

      if (apiRole === "OWNER") {
        if (!org.owners.some((id) => id.toString() === userId)) {
          org.owners.push(userId);
        }
        if (member) member.role = "admin";
      } else {
        org.owners = org.owners.filter((id) => id.toString() !== userId);
        if (!member) {
          return res.status(404).json({ message: "Member not found in organization" });
        }
        member.role = mapApiRoleToMemberRole(apiRole);
      }

      await org.save();

      await UserTypeModel.findOneAndUpdate(
        { _id: userId, "organizations.organization": orgId },
        { $set: { "organizations.$.role": mapApiRoleToUserOrgRole(apiRole) } }
      );

      res.status(200).json({
        message: "Member role updated successfully",
        payload: org,
      });
    } catch (error) {
      res.status(500).json({ message: "Error updating member role", error: error.message });
    }
  }
);

organizationRouter.get("/:orgId/members", async (req, res) => {
  try {
    const { orgId } = req.params;

    const org = await Organization.findById(orgId).populate(
      "members.user",
      "username email avatar"
    );

    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.status(200).json({
      message: "Organization members fetched successfully",
      payload: org.members,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching members", error: error.message });
  }
});

export default organizationRouter;
