# Admin Dashboard Access Guide

## Overview

The admin dashboard provides access to platform-wide management features including:
- Transaction monitoring and management
- Dispute resolution
- User administration
- Platform statistics and metrics
- Financial account oversight

## How to Access the Admin Dashboard

1. **Navigate to the Admin Route**
   - Go to `/admin` in your browser
   - URL: `https://your-domain.com/admin`

2. **Connect Your Wallet**
   - You must have your wallet connected to access admin features
   - The system will check if your wallet has admin privileges

3. **Authentication Process**
   - The system checks your wallet address against the admin database
   - The `checkAdminStatus` API endpoint verifies your admin privileges
   - Your admin role determines what specific features you can access

## Default Admin Access

The system is configured with a default super admin:
- Wallet address: `6aDamejpzi67CEvfYbe2q5s6xYRhLBSMfpXaTVdYT3AJ`
- This address is set up during the initial platform setup process
- Connect with this wallet to access full administrative capabilities

## Admin Roles

The system supports multiple admin roles with varying permissions:

1. **SUPER_ADMIN**
   - Complete access to all platform functions
   - Can manage other admins and their permissions

2. **SUPPORT_ADMIN**
   - Can handle customer support issues
   - Access to transaction details and basic user data
   - Can assist with dispute resolution

3. **DISPUTE_MANAGER**
   - Specializes in resolving disputes between users
   - Can review transaction evidence and make resolution decisions

4. **FINANCIAL_ADMIN**
   - Manages financial accounts and transactions
   - Has access to platform financial data

5. **READ_ONLY**
   - View-only access to the admin dashboard
   - Cannot make changes to any platform data

## Features Available in the Admin Dashboard

### Transaction Management
- View all platform transactions
- Filter transactions by status, type, date range, etc.
- Manually update transaction status when needed
- View detailed transaction flow analytics

### Dispute Resolution
- Review active disputes
- Examine evidence provided by both parties
- Make resolution decisions (in favor of maker or taker)
- Send system messages to inform users of outcomes

### Admin Management
- View current admin users
- Add new admin users (requires SUPER_ADMIN role)
- Modify admin permissions
- Deactivate admin accounts when needed

### Platform Statistics
- View transaction volume by currency
- Track platform activity with 30-day charts
- Monitor token usage statistics
- Identify top makers by volume

## Security Considerations

- Your admin access is tied to your wallet address
- All admin actions are logged and auditable
- Use appropriate caution when making administrative changes
- Be especially careful when resolving disputes or updating transaction status

## Technical Implementation

- Admin authentication happens via the `adminMiddleware` function
- Admin routes require the `x-wallet-address` header
- Role-specific actions are protected by the `roleMiddleware` function
- The dashboard frontend uses React Query for efficient data fetching

## Troubleshooting

If you cannot access the admin dashboard:
1. Ensure your wallet is properly connected
2. Verify that your wallet address has been added to the admin database
3. Check the console for any authentication errors
4. Contact a SUPER_ADMIN to verify your admin status

For technical issues:
- API endpoint: `/api/admin/status` - Checks your admin status
- Look for authentication errors in the network tab of browser dev tools