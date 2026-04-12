import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserService } from './user.service';
import { config } from '../../config/env';
import { ApiResponse } from '../../types/api.types';

export class UserController {
  // Login
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      // Get user
      const user = await UserService.getUserByEmail(email);
      
      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          statusCode: 401,
        } as ApiResponse);
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
          statusCode: 401,
        } as ApiResponse);
        return;
      }

      // Generate token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
      );

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
          },
        },
      } as ApiResponse);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Get all users
  static async getAllUsers(_req: Request, res: Response): Promise<void> {
    try {
      const users = await UserService.getAllUsers();
      
      res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: users,
      } as ApiResponse);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Get user by ID
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const user = await UserService.getUserById(parseInt(id));
      
      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: user,
      } as ApiResponse);
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Create user
  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role } = req.body;

      if (!name || !email || !password) {
        res.status(400).json({
          success: false,
          message: 'Name, email, and password are required',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      // Check if email already exists
      const existingUser = await UserService.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: 'Email already exists',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await UserService.createUser({
        name,
        email,
        password: hashedPassword,
        role: role || 'staff',
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: newUser,
      } as ApiResponse);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Update user
  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, email, role, password } = req.body;

      const updateData: any = { name, email, role };
      
      // Hash password if provided
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }

      const updatedUser = await UserService.updateUser(parseInt(id), updateData);
      
      if (!updatedUser) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: updatedUser,
      } as ApiResponse);
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  // Delete user
  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const deleted = await UserService.deleteUser(parseInt(id));
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'User not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }
}
