const PERMISSIONS = {
  employee: [
    'send_message', 'read_recent', 'search_users', 'get_user_profile',
    'get_my_profile', 'search_messages', 'send_media',
  ],
  manager: [
    'send_message', 'read_recent', 'search_users', 'get_user_profile',
    'get_my_profile', 'search_messages', 'send_media',
    'create_group_chat', 'add_group_members', 'remove_group_members',
    'rename_group', 'leave_group', 'list_groups', 'group_info',
    'list_members', 'react_message', 'delete_message', 'edit_message',
    'forward_message', 'sync_history',
  ],
};

export function checkPermission(role, toolName) {
  return PERMISSIONS[role]?.includes(toolName) ?? false;
}

/**
 * Get user role from MongoDB. Falls back to 'employee'.
 * @param {string} zaloId
 * @returns {Promise<string>}
 */
export async function getUserRole(zaloId) {
  try {
    const { User } = await import('../models/index.js');
    const user = await User.findOne({ zaloId }).lean();
    return user?.role ?? 'employee';
  } catch {
    return 'employee';
  }
}
