package com.razorpay.recovery.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lightweight operator sign-in check used by the frontend login gate. Unlike the
 * auto-gated admin/radar/test paths, this endpoint performs its own key check so
 * the UI can validate credentials and receive a clear 200/401 without tripping the
 * global interceptor. If no key is configured the gate stays open (local dev).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String HEADER = "X-Admin-Key";

    @Value("${admin.api-key:}")
    private String adminApiKey;

    @GetMapping("/check")
    public ResponseEntity<Map<String, Object>> check(@RequestHeader(value = HEADER, required = false) String provided) {
        boolean valid = adminApiKey == null || adminApiKey.isBlank()
                || (provided != null && constantTimeEquals(provided, adminApiKey));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("authenticated", valid);
        if (!valid) {
            body.put("error", "Unauthorized: valid X-Admin-Key required");
            log.warn("Rejected operator sign-in with invalid API key");
            return ResponseEntity.status(401).body(body);
        }
        return ResponseEntity.ok(body);
    }

    private static boolean constantTimeEquals(String a, String b) {
        return MessageDigest.isEqual(
                a.getBytes(StandardCharsets.UTF_8),
                b.getBytes(StandardCharsets.UTF_8));
    }
}
