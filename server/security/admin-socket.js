export function attachAdminSocketAuthorization(
    socket,
    sessionManager,
    now = Date.now()
) {
    const cookie = socket?.handshake?.headers?.cookie;
    socket.verifyAdminAuthorization = (currentTime = Date.now()) => {
        const session = sessionManager.tryVerifyCookie(cookie, currentTime);
        socket.isAdminAuthorized = Boolean(session);
        socket.adminSession = session;
        return socket.isAdminAuthorized;
    };
    return socket.verifyAdminAuthorization(now);
}

export function requireAuthorizedAdminSocket(
    socket,
    callback,
    now = Date.now()
) {
    if (socket?.verifyAdminAuthorization?.(now)) return true;
    if (typeof callback === 'function') {
        callback({
            success: false,
            code: 'ADMIN_AUTH_REQUIRED',
            error: 'Administrator authentication is required'
        });
    }
    return false;
}
