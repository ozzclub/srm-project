import { Request, Response } from 'express';
import { LocationService } from './location.service';
import { ApiResponse } from '../../types/api.types';

export class LocationController {
  static async getAllLocations(_req: Request, res: Response): Promise<void> {
    try {
      const locations = await LocationService.getAllLocations();
      
      res.status(200).json({
        success: true,
        message: 'Locations retrieved successfully',
        data: locations,
      } as ApiResponse);
    } catch (error) {
      console.error('Get locations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  static async getLocationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const location = await LocationService.getLocationById(parseInt(id));
      
      if (!location) {
        res.status(404).json({
          success: false,
          message: 'Location not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Location retrieved successfully',
        data: location,
      } as ApiResponse);
    } catch (error) {
      console.error('Get location error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  static async createLocation(req: Request, res: Response): Promise<void> {
    try {
      const { location_name, location_type } = req.body;

      if (!location_name || !location_type) {
        res.status(400).json({
          success: false,
          message: 'Location name and type are required',
          statusCode: 400,
        } as ApiResponse);
        return;
      }

      const newLocation = await LocationService.createLocation({
        location_name,
        location_type,
      });

      res.status(201).json({
        success: true,
        message: 'Location created successfully',
        data: newLocation,
      } as ApiResponse);
    } catch (error) {
      console.error('Create location error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const data = req.body;

      const updatedLocation = await LocationService.updateLocation(parseInt(id), data);
      
      if (!updatedLocation) {
        res.status(404).json({
          success: false,
          message: 'Location not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Location updated successfully',
        data: updatedLocation,
      } as ApiResponse);
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }

  static async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      const deleted = await LocationService.deleteLocation(parseInt(id));
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Location not found',
          statusCode: 404,
        } as ApiResponse);
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Location deleted successfully',
      } as ApiResponse);
    } catch (error) {
      console.error('Delete location error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        statusCode: 500,
      } as ApiResponse);
    }
  }
}
