# Example Usage of extract_user_id Decorator

## Method 1: Using the @extract_user_id decorator

```python
from flask import request
from flask_restful import Resource
from helpers.authenticate import token_required, permission_required
from helpers.user_specfic_helper import extract_user_id

class MyResource(Resource):
    @token_required
    @permission_required("campaign", "r")
    @extract_user_id
    def get(self, user_id=None):
        """
        Get campaigns based on user role.
        
        - For admin/superadmin: user_id will be None, returns all campaigns
        - For regular users: user_id will be their actual ID, returns their campaigns only
        """
        if user_id is None:
            # Admin view - show all campaigns
            campaigns = get_all_campaigns()
            message = "Fetched all campaigns (admin view)"
        else:
            # Regular user view - show only their campaigns
            campaigns = get_campaigns_by_user_id(user_id)
            message = f"Fetched campaigns for user_id: {user_id}"
        
        return {
            "message": message,
            "campaigns": campaigns,
            "user_id": user_id
        }, 200
```

## Method 2: Using the get_user_id_from_token() helper function

```python
from flask import request
from flask_restful import Resource
from helpers.authenticate import token_required, permission_required
from helpers.user_specfic_helper import get_user_id_from_token

class AnotherResource(Resource):
    @token_required
    @permission_required("campaign", "r")
    def post(self):
        """
        Create a campaign with user-specific filtering.
        """
        # Extract user_id manually
        user_id = get_user_id_from_token()
        
        data = request.get_json()
        
        if user_id is None:
            # Admin can create campaigns for any user
            owner_id = data.get('owner_id') or data.get('user_id')
            message = "Campaign created by admin"
        else:
            # Regular user can only create campaigns for themselves
            owner_id = user_id
            message = f"Campaign created by user_id: {user_id}"
        
        campaign_id = create_campaign(data, owner_id)
        
        return {
            "message": message,
            "campaign_id": campaign_id,
            "owner_id": owner_id
        }, 201
```

## Important Notes:

1. **Decorator Order Matters**: 
   - `@token_required` must come before `@extract_user_id`
   - `@permission_required` should come between them if used

2. **Admin/Superadmin Roles**:
   - These roles get `user_id = None`
   - Use this to show all data or allow operations on any user

3. **Regular Users**:
   - Get their actual `user_id` from the token
   - Use this to filter data by user_id

4. **Function Signature**:
   - When using `@extract_user_id`, add `user_id=None` as a parameter
   - When using `get_user_id_from_token()`, no parameter needed
