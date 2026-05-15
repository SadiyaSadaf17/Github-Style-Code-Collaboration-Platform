/**
 * Profile image: MongoDB field is `avatar`. Legacy client data may use `profileImage`.
 */
export function getUserAvatarUrl(user) {
  if (!user) {
    return "https://ui-avatars.com/api/?name=%3F&background=d0d7de&color=1f2328&size=128";
  }
  const direct = user.avatar || user.profileImage;
  if (direct && typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }
  const seed = encodeURIComponent((user.username || user.name || "User").slice(0, 40));
  return `https://ui-avatars.com/api/?name=${seed}&background=0969da&color=fff&size=128`;
}
