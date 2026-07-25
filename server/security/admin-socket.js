export function attachAdminSocketAuthorization(
    socket,
    sessionManager,
    now = Date.now()
) {
    const session = sessionManager.tryVerifyCookie(
        socket?.handshake?.headers?.cookie,
        now
    );
    socket.isAdminAuthorized = Boolean(session);
    socket.adminSession = session;
    return socket.isAdminAuthorized;
}

export function requireAuthorizedAdminSocket(socket, callback) {
    if (socket?.isAdminAuthorized) return true;
    if (typeof callback === 'function') {
        callback({
            success: false,
            code: 'ADMIN_AUTH_REQUIRED',
            error: 'Administrator authentication is required'
        });
    }
    return false;
}
