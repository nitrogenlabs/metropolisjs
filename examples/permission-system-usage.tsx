/**
 * Permission System Usage Examples for MetropolisJS
 * 
 * This file demonstrates how to use the 5-level RBAC permission system
 * with various patterns and use cases.
 */

import React, { useEffect } from 'react';
import { 
  usePermissionActions, 
  usePermissions, 
  PermissionGuard, 
  PermissionLevel 
} from '@nlabs/metropolisjs';
import type { Permission } from '@nlabs/metropolisjs';

// =============================================================================
// Example 1: Basic Permission Level Checking
// =============================================================================

export const BasicPermissionExample = () => {
  const { userLevel, isAdmin, isModerator, isUser } = usePermissions();

  return (
    <div>
      <h2>Your Permission Level: {userLevel}</h2>
      <ul>
        <li>Is User: {isUser ? 'Yes' : 'No'}</li>
        <li>Is Moderator: {isModerator ? 'Yes' : 'No'}</li>
        <li>Is Admin: {isAdmin ? 'Yes' : 'No'}</li>
      </ul>
    </div>
  );
};

// =============================================================================
// Example 2: Using Permission Guard Component
// =============================================================================

export const PermissionGuardExample = () => {
  return (
    <div>
      <h1>Welcome to the App</h1>
      
      <PermissionGuard 
        requiredLevel={PermissionLevel.USER}
        fallback={<p>Please log in to view content</p>}
      >
        <p>You can see this content as a logged-in user</p>
      </PermissionGuard>

      <PermissionGuard 
        requiredLevel={PermissionLevel.MODERATOR}
        fallback={<p>Moderator access required</p>}
      >
        <button>Moderate Content</button>
      </PermissionGuard>

      <PermissionGuard 
        requiredLevel={PermissionLevel.ADMIN}
        fallback={null}
      >
        <button>Admin Settings</button>
      </PermissionGuard>
    </div>
  );
};

// =============================================================================
// Example 3: Creating and Managing Permissions
// =============================================================================

export const ManagePermissionsExample = () => {
  const permissionActions = usePermissionActions();
  const { isAdmin } = usePermissions();

  const grantUserPermission = async (userId: string) => {
    if (!isAdmin) {
      console.error('Only admins can grant permissions');
      return;
    }

    try {
      const permission = await permissionActions.add({
        userId,
        name: 'Moderator Role',
        level: PermissionLevel.MODERATOR,
        resource: 'posts',
        description: 'Can moderate posts and comments'
      });
      console.log('Permission granted:', permission);
    } catch (error) {
      console.error('Failed to grant permission:', error);
    }
  };

  const revokePermission = async (permissionId: string) => {
    try {
      await permissionActions.remove(permissionId);
      console.log('Permission revoked');
    } catch (error) {
      console.error('Failed to revoke permission:', error);
    }
  };

  return (
    <div>
      <h2>Permission Management</h2>
      <button onClick={() => grantUserPermission('user123')}>
        Grant Moderator Permission
      </button>
    </div>
  );
};

// =============================================================================
// Example 4: Resource-Specific Permissions
// =============================================================================

export const ResourcePermissionsExample = () => {
  const { checkResource } = usePermissions();

  const canEditPosts = checkResource('posts', PermissionLevel.MODERATOR);
  const canDeleteUsers = checkResource('users', PermissionLevel.ADMIN);
  const canViewReports = checkResource('reports', PermissionLevel.MODERATOR);

  return (
    <div>
      <h2>Resource Permissions</h2>
      <ul>
        <li>Can Edit Posts: {canEditPosts ? 'Yes' : 'No'}</li>
        <li>Can Delete Users: {canDeleteUsers ? 'Yes' : 'No'}</li>
        <li>Can View Reports: {canViewReports ? 'Yes' : 'No'}</li>
      </ul>

      <PermissionGuard 
        requiredLevel={PermissionLevel.MODERATOR} 
        resource="posts"
        fallback={<p>You cannot edit posts</p>}
      >
        <button>Edit Post</button>
      </PermissionGuard>
    </div>
  );
};

// =============================================================================
// Example 5: Listing User Permissions
// =============================================================================

export const UserPermissionsListExample = () => {
  const permissionActions = usePermissionActions();
  const [permissions, setPermissions] = React.useState<Permission[]>([]);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const userId = 'current-user-id'; // Get from session
        const userPermissions = await permissionActions.listByUser(userId);
        setPermissions(userPermissions);
      } catch (error) {
        console.error('Failed to load permissions:', error);
      }
    };

    loadPermissions();
  }, [permissionActions]);

  return (
    <div>
      <h2>My Permissions</h2>
      <ul>
        {permissions.map((permission) => (
          <li key={permission.permissionId}>
            <strong>{permission.name}</strong> - Level: {permission.level}
            {permission.resource && ` (Resource: ${permission.resource})`}
            {permission.description && <p>{permission.description}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
};

// =============================================================================
// Example 6: Permission Checking in API Calls
// =============================================================================

export const ProtectedAPICallExample = () => {
  const { hasPermission } = usePermissions();
  const permissionActions = usePermissionActions();

  const deletePost = async (postId: string) => {
    // Check permission before making API call
    if (!hasPermission(PermissionLevel.MODERATOR)) {
      alert('You do not have permission to delete posts');
      return;
    }

    try {
      // Make API call to delete post
      console.log('Deleting post:', postId);
    } catch (error) {
      console.error('Failed to delete post:', error);
    }
  };

  const checkUserPermission = async (userId: string, resource: string) => {
    try {
      const hasAccess = await permissionActions.check(
        userId, 
        resource, 
        PermissionLevel.MODERATOR
      );
      console.log('User has access:', hasAccess);
      return hasAccess;
    } catch (error) {
      console.error('Permission check failed:', error);
      return false;
    }
  };

  return (
    <div>
      <button onClick={() => deletePost('post123')}>Delete Post</button>
      <button onClick={() => checkUserPermission('user123', 'posts')}>
        Check User Permission
      </button>
    </div>
  );
};

// =============================================================================
// Example 7: Permission Levels Overview
// =============================================================================

export const PermissionLevelsReference = () => {
  return (
    <div>
      <h2>Permission Levels (RBAC)</h2>
      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Name</th>
            <th>Value</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>0</td>
            <td>Guest</td>
            <td>PermissionLevel.GUEST</td>
            <td>Unauthenticated users, limited read access</td>
          </tr>
          <tr>
            <td>1</td>
            <td>User</td>
            <td>PermissionLevel.USER</td>
            <td>Authenticated users, can create and edit own content</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Moderator</td>
            <td>PermissionLevel.MODERATOR</td>
            <td>Can moderate content, manage users</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Admin</td>
            <td>PermissionLevel.ADMIN</td>
            <td>Full access to application features</td>
          </tr>
          <tr>
            <td>4</td>
            <td>Super Admin</td>
            <td>PermissionLevel.SUPER_ADMIN</td>
            <td>Complete system access, can manage admins</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

// =============================================================================
// Example 8: Conditional Rendering Based on Permissions
// =============================================================================

export const ConditionalRenderingExample = () => {
  const { userLevel, isAdmin, isModerator, isUser } = usePermissions();

  return (
    <div>
      <h1>Dashboard</h1>
      
      {isUser && (
        <section>
          <h2>My Content</h2>
          <p>Create and manage your posts</p>
        </section>
      )}

      {isModerator && (
        <section>
          <h2>Moderation Tools</h2>
          <button>Review Flagged Content</button>
          <button>Ban User</button>
        </section>
      )}

      {isAdmin && (
        <section>
          <h2>Admin Panel</h2>
          <button>User Management</button>
          <button>System Settings</button>
          <button>Analytics</button>
        </section>
      )}

      {userLevel >= PermissionLevel.SUPER_ADMIN && (
        <section>
          <h2>Super Admin</h2>
          <button>Manage Admins</button>
          <button>System Configuration</button>
        </section>
      )}
    </div>
  );
};

// =============================================================================
// Example 9: Using with Metropolis Component
// =============================================================================

export const MetropolisConfigExample = () => {
  return `
    import { Metropolis, PermissionLevel } from '@nlabs/metropolisjs';

    const App = () => {
      return (
        <Metropolis config={{
          development: {
            environment: 'development',
            app: {
              api: {
                url: 'http://localhost:3000/app',
                public: 'http://localhost:3000/public'
              }
            }
          }
        }}>
          <YourApp />
        </Metropolis>
      );
    };

    const YourApp = () => {
      const { isAdmin } = usePermissions();
      const permissionActions = usePermissionActions();

      // Use permissions throughout your app
      return (
        <div>
          {isAdmin && <AdminPanel />}
          <ContentArea />
        </div>
      );
    };
  `;
};

// =============================================================================
// Example 10: Testing Permissions
// =============================================================================

export const testPermissionSystem = () => {
  return `
    import { renderHook } from '@testing-library/react';
    import { Metropolis, usePermissions, PermissionLevel } from '@nlabs/metropolisjs';

    describe('Permission System', () => {
      it('should check user permissions correctly', () => {
        const wrapper = ({ children }) => (
          <Metropolis config={{...}}>
            {children}
          </Metropolis>
        );

        const { result } = renderHook(() => usePermissions(), { wrapper });

        expect(result.current.userLevel).toBe(1); // User level
        expect(result.current.isUser).toBe(true);
        expect(result.current.isAdmin).toBe(false);
      });

      it('should use PermissionGuard correctly', () => {
        const { container } = render(
          <Metropolis config={{...}}>
            <PermissionGuard 
              requiredLevel={PermissionLevel.ADMIN}
              fallback={<div>No access</div>}
            >
              <div>Admin content</div>
            </PermissionGuard>
          </Metropolis>
        );

        // Assert based on current user level
        expect(container.textContent).toContain('No access');
      });
    });
  `;
};
