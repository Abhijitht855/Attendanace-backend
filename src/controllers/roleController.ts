import { Request, Response } from 'express';
import Role, { SYSTEM_PERMISSIONS } from '../models/Role';

// Helper to check if permissions are valid
const arePermissionsValid = (permissions: string[]): boolean => {
  return permissions.every((p) => SYSTEM_PERMISSIONS.includes(p));
};

// @desc    Create a new role (Super Admin Only)
// @route   POST /api/roles
export const createRole = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (user.role !== 'SUPER_ADMIN' && user.roleId?.name !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Forbidden. Super Admin access required.' });
    }

    const { name, permissions, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Role name is required' });
    }

    const normalizedName = name.toUpperCase().trim();

    // Check if role name already exists
    const existingRole = await Role.findOne({ name: normalizedName });
    if (existingRole) {
      return res.status(400).json({ message: `Role '${normalizedName}' already exists` });
    }

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: 'permissions must be an array of strings' });
      }
      if (!arePermissionsValid(permissions)) {
        return res.status(400).json({ message: 'One or more permissions are invalid' });
      }
    }

    const role = await Role.create({
      name: normalizedName,
      permissions: permissions || [],
      description: description || '',
    });

    res.status(201).json({
      message: 'Role created successfully',
      role,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Get all roles list
// @route   GET /api/roles
export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find().sort({ name: 1 });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Update custom role permissions/details (Super Admin Only)
// @route   PATCH /api/roles/:id
export const updateRole = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (user.role !== 'SUPER_ADMIN' && user.roleId?.name !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Forbidden. Super Admin access required.' });
    }

    const { name, permissions, description } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Prevent renaming system-critical roles
    const protectedRoles = ['SUPER_ADMIN', 'ADMIN_DEFAULT', 'EMPLOYEE_DEFAULT'];
    if (protectedRoles.includes(role.name)) {
      if (name !== undefined && name.toUpperCase().trim() !== role.name) {
        return res.status(400).json({ message: `Cannot rename protected system role '${role.name}'` });
      }
    }

    if (name !== undefined) {
      const normalizedName = name.toUpperCase().trim();
      if (normalizedName !== role.name) {
        const existingName = await Role.findOne({ name: normalizedName });
        if (existingName) {
          return res.status(400).json({ message: `Role name '${normalizedName}' already in use` });
        }
        role.name = normalizedName;
      }
    }

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: 'permissions must be an array of strings' });
      }
      if (!arePermissionsValid(permissions)) {
        return res.status(400).json({ message: 'One or more permissions are invalid' });
      }
      role.permissions = permissions;
    }

    if (description !== undefined) {
      role.description = description;
    }

    await role.save();

    res.json({
      message: 'Role updated successfully',
      role,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

// @desc    Delete a custom role (Super Admin Only)
// @route   DELETE /api/roles/:id
export const deleteRole = async (req: Request, res: Response) => {
  try {
    const user = req.user as any;
    if (user.role !== 'SUPER_ADMIN' && user.roleId?.name !== 'SUPER_ADMIN') {
      return res.status(403).json({ message: 'Forbidden. Super Admin access required.' });
    }

    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Prevent deleting default system roles
    const protectedRoles = ['SUPER_ADMIN', 'ADMIN_DEFAULT', 'EMPLOYEE_DEFAULT'];
    if (protectedRoles.includes(role.name)) {
      return res.status(400).json({ message: `Cannot delete protected system role '${role.name}'` });
    }

    await Role.findByIdAndDelete(req.params.id);

    res.json({ message: `Role '${role.name}' deleted successfully` });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
