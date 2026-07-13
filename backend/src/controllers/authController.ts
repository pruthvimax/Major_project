import { Request, Response } from 'express';
import User from '../models/User';
import { generateToken } from '../config/jwt';
import { validationResult } from 'express-validator';

interface AuthRequest extends Request {
  user?: any;
}

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📝 Registration attempt received');
    console.log('📝 Body:', req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const { name, email, password, mobile, address, role } = req.body;

    console.log('📝 Checking if user exists:', email);

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ User already exists:', email);
      res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
      return;
    }

    console.log('✅ User does not exist. Creating user...');

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      mobile,
      address,
      role: role || 'buyer',
    });

    console.log('✅ User created successfully:', user._id);

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    console.log('✅ Token generated');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error: any) {
    console.error('❌ Register error:', error);
    console.error('❌ Error details:', error.message);
    if (error.code === 11000) {
      console.error('❌ Duplicate key error');
    }
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📝 Login attempt:', req.body.email);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      res.status(400).json({
        success: false,
        errors: errors.array(),
      });
      return;
    }

    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log('❌ User not found:', email);
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    console.log('✅ User found:', user._id);

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      console.log('❌ Password mismatch for:', email);
      res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
      return;
    }

    console.log('✅ Password matched');

    // Generate token
    const token = generateToken(user._id.toString(), user.role);

    console.log('✅ Login successful for:', email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        address: user.address,
      },
    });
  } catch (error: any) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Logout user - Fixed unused req parameter
export const logout = async (_req: Request, res: Response): Promise<void> => {
  try {
    // In JWT, logout is handled client-side by removing token
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};