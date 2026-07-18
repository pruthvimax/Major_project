import { Request, Response } from 'express';
import User, { IUser } from '../models/User';

interface AuthRequest extends Request {
  user?: IUser;
}

// @desc    Get all users - Fixed unused req parameter
export const getUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find();
    
    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error: any) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id);
    
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
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, mobile, address } = req.body;
    const userId = req.user?._id;

    const user = await User.findByIdAndUpdate(
      userId,
      { name, mobile, address },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get farmers list - Fixed unused req parameter
export const getFarmers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const farmers = await User.find({ role: 'farmer' });
    
    res.status(200).json({
      success: true,
      count: farmers.length,
      farmers,
    });
  } catch (error: any) {
    console.error('Get farmers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get buyers list - Fixed unused req parameter
export const getBuyers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const buyers = await User.find({ role: 'buyer' });
    
    res.status(200).json({
      success: true,
      count: buyers.length,
      buyers,
    });
  } catch (error: any) {
    console.error('Get buyers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update push notification token
// @route   PUT /api/users/push-token
// @access  Private
export const updatePushToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pushToken } = req.body;
    const userId = req.user?._id;

    if (!pushToken) {
      res.status(400).json({
        success: false,
        message: 'Push token is required',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { pushToken },
      { new: true }
    );

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Push token updated successfully',
      user,
    });
  } catch (error: any) {
    console.error('Update push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};