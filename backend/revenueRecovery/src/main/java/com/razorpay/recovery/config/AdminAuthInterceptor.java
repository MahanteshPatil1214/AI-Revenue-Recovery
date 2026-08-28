package com.razorpay.recovery.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Lightweight API-key gate for management / operator endpoints
 * (/api/v1/admin/**, /api/v1/radar/**, /api/v1/test/**).
 *
 * Key is supplied via the {@code X-Admin-Key} header and compared in constant
 * time against the configured {@code admin.api-key} value. If no key is
 * configured the gate is open, matching the project's convenient local-dev
 * posture (safe by default only when a real key is set in production config).
 */
@Slf4j
@Component
public class AdminAuthInterceptor implements HandlerInterceptor {

    private static final String HEADER = "X-Admin-Key";

    @Value("${admin.api-key:}")
    private String adminApiKey;

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
            throws Exception {
        if (adminApiKey == null || adminApiKey.isBlank()) {
            // No key configured -> gate open (local dev convenience).
            return true;
        }

        String provided = request.getHeader(HEADER);
        if (provided == null || !constantTimeEquals(provided, adminApiKey)) {
            log.warn("Rejected admin request to {} (missing/invalid API key)", request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Unauthorized: valid X-Admin-Key required\"}");
            return false;
        }
        return true;
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }
}
