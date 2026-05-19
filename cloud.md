# Cloud / Frontend Notes

- Frontend should call `GET /api/profile` on the backend to retrieve the combined local and Hamara profile data.
- Include the user's access token in the `Authorization` header.

Example:

```http
GET http://localhost:5001/api/profile
Authorization: Bearer <access-token>
```

- Response shape:

```json
{
  "success": true,
  "message": "Profile",
  "data": {
    "user": { /* local user record */ },
    "hamaraUserProfileData": { /* remote Hamara player data or null */ }
  },
  "timestamp": "..."
}
```

- If frontend previously attempted to call `/api/profile` directly on the Hamara backend, switch to calling the local backend proxy above.

- If your frontend needs specific Hamara fields, map them from `hamaraUserProfileData` after retrieving the profile.
