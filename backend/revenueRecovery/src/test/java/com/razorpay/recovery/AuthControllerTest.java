package com.razorpay.recovery;

import com.razorpay.recovery.controller.AuthController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringJUnitConfig(classes = AuthController.class)
class AuthControllerTest {

    @Autowired
    private AuthController controller;

    @BeforeEach
    void resetKey() {
        ReflectionTestUtils.setField(controller, "adminApiKey", "dev_admin_key_2026");
    }

    @Test
    void rejectWrongKey() {
        ResponseEntity<Map<String, Object>> res = controller.check("wrong-key");
        assertThat(res.getStatusCodeValue()).isEqualTo(401);
        assertThat(res.getBody().get("authenticated")).isEqualTo(false);
    }

    @Test
    void acceptCorrectKey() {
        ResponseEntity<Map<String, Object>> res = controller.check("dev_admin_key_2026");
        assertThat(res.getStatusCodeValue()).isEqualTo(200);
        assertThat(res.getBody().get("authenticated")).isEqualTo(true);
    }

    @Test
    void openWhenNoKeyConfigured() {
        ReflectionTestUtils.setField(controller, "adminApiKey", "");
        ResponseEntity<Map<String, Object>> res = controller.check(null);
        assertThat(res.getStatusCodeValue()).isEqualTo(200);
        assertThat(res.getBody().get("authenticated")).isEqualTo(true);
    }
}
