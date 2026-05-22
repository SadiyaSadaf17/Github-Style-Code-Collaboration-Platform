import jwt from 'jsonwebtoken';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Verifies JWT token and checks user role permissions
 */

const roleHierarchy = {
  ADMIN: ['ADMIN', 'MAINTAINER', 'CONTRIBUTOR', 'USER'],
  MAINTAINER: ['MAINTAINER', 'CONTRIBUTOR', 'USER'],
  CONTRIBUTOR: ['CONTRIBUTOR', 'USER'],
  USER: ['USER']
};

/**
 * Verify JWT token
 */
export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        message: 'Authorization token is required' 
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token has expired',
        error: 'TOKEN_EXPIRED'
      });
    }
    
    return res.status(401).json({ 
      message: 'Invalid token',
      error: error.message
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {...string} allowedRoles - Roles allowed to access the route
 */
export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'User not authenticated' 
      });
    }

    const userRole = req.user.role;
    
    // Check if user role is in allowed roles or has higher hierarchy
    const isAuthorized = allowedRoles.some(role => {
      const userHierarchy = roleHierarchy[userRole] || [];
      return userHierarchy.includes(role);
    });

    if (!isAuthorized) {
      return res.status(403).json({ 
        message: 'Access denied: Insufficient permissions',
        requiredRoles: allowedRoles,
        userRole: userRole
      });
    }

    next();
  };
};

/**
 * Repository-level permission check
 * Checks if user has permission for specific repository operation
 */
export const checkRepoPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'User not authenticated' 
        });
      }

      const { repoId } = req.params;
      
      const { RepoModel } = await import('../models/repoModel.js');
      const { getRepoTeamRole } = await import('../services/repoAccessService.js');
      
      const repo = await RepoModel.findById(repoId);
      if (!repo) {
        return res.status(404).json({ 
          message: 'Repository not found' 
        });
      }

      const teamRole = getRepoTeamRole(repo, req.user.userId);
      if (teamRole === 'owner') {
        return next();
      }

      const canRead = teamRole === 'collaborator' || teamRole === 'viewer';
      const canPush = teamRole === 'collaborator';

      const allowed =
        (requiredPermission === 'READ' && canRead) ||
        (requiredPermission === 'PULL' && canRead) ||
        (requiredPermission === 'PUSH' && canPush) ||
        (requiredPermission === 'ADMIN' && teamRole === 'owner');

      if (allowed) {
        return next();
      }

      return res.status(403).json({ 
        message: 'Access denied: Insufficient repository permissions',
        requiredPermission: requiredPermission,
        userRole: teamRole || 'NONE'
      });

    } catch (error) {
      res.status(500).json({ 
        message: 'Permission check failed',
        error: error.message 
      });
    }
  };
};

/**
 * Organization-level permission check
 */
export const checkOrgPermission = (requiredRole) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'User not authenticated' 
        });
      }

      const { orgId } = req.params;
      
      // Import Organization model
      const { Organization } = await import('../models/organizationModel.js');
      
      const org = await Organization.findById(orgId);
      if (!org) {
        return res.status(404).json({ 
          message: 'Organization not found' 
        });
      }

      const userId = req.user.userId.toString();
      const isOwner = (org.owners || []).some((id) => id.toString() === userId);

      if (isOwner) {
        return next();
      }

      const member = org.members.find((m) => m.user.toString() === userId);

      const memberAllows = {
        OWNER: false,
        ADMIN: member?.role === "admin",
        MEMBER: member?.role === "admin" || member?.role === "member",
      };

      if (memberAllows[requiredRole]) {
        return next();
      }

      return res.status(403).json({ 
        message: 'Access denied: Insufficient organization permissions',
        requiredRole: requiredRole,
        userRole: member?.role || 'NONE'
      });

    } catch (error) {
      res.status(500).json({ 
        message: 'Permission check failed',
        error: error.message 
      });
    }
  };
};

/**
 * Rate limiting middleware for RBAC
 */
export const rateLimitByRole = {
  ADMIN: { windowMs: 15 * 60 * 1000, maxRequests: 1000 },
  MAINTAINER: { windowMs: 15 * 60 * 1000, maxRequests: 500 },
  CONTRIBUTOR: { windowMs: 15 * 60 * 1000, maxRequests: 300 },
  USER: { windowMs: 15 * 60 * 1000, maxRequests: 100 }
};

/**
 * Check if request is from owner (user making request is owner of resource)
 */
export const isOwner = (req, res, next) => {
  try {
    const { userId } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ 
        message: 'User not authenticated' 
      });
    }

    if (req.user.userId !== userId && req.user.role !== 'ADMIN') {
      return res.status(403).json({ 
        message: 'Access denied: You can only access your own resources' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ 
      message: 'Permission check failed',
      error: error.message 
    });
  }
};

export default {
  authenticateToken,
  authorizeRoles,
  checkRepoPermission,
  checkOrgPermission,
  isOwner,
  rateLimitByRole
};