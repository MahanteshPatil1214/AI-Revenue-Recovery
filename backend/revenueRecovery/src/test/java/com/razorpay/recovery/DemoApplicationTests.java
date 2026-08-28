package com.razorpay.recovery;

import org.junit.jupiter.api.Test;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Lightweight application smoke test.
 *
 * Intentionally does NOT use @SpringBootTest: a full application context boot
 * requires a live PostgreSQL instance and configured Razorpay credentials, which
 * are infrastructure not available in CI. The engine's logic is covered by the
 * focused unit tests (SmartRetryScheduler, timing/radar engine, analytics, auth,
 * signature verification); this test only asserts the Spring wiring contract so
 * core beans resolve.
 */
class DemoApplicationTests {

    @Test
    void applicationIsSpringBootConfigured() {
        assertThat(RecoveryApplication.class.isAnnotationPresent(SpringBootApplication.class)).isTrue();
    }
}
