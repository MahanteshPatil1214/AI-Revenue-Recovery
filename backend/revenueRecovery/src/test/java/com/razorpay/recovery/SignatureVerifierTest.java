package com.razorpay.recovery;

import com.razorpay.recovery.controller.SignatureVerifier;
import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class SignatureVerifierTest {

    private final SignatureVerifier verifier = new SignatureVerifier();

    private static String hmacHex(String payload, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] hash = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : hash) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Test
    void acceptsMatchingSignature() throws Exception {
        String payload = "{\"event\":\"payment.failed\"}";
        String sig = hmacHex(payload, "secret");
        assertThat(verifier.verifyWebhookSignature(payload, sig, "secret")).isTrue();
    }

    @Test
    void rejectsWrongSecret() throws Exception {
        String payload = "{\"event\":\"payment.failed\"}";
        String sig = hmacHex(payload, "right-secret");
        assertThat(verifier.verifyWebhookSignature(payload, sig, "wrong-secret")).isFalse();
    }

    @Test
    void rejectsMissingInputs() {
        assertThat(verifier.verifyWebhookSignature(null, "sig", "secret")).isFalse();
        assertThat(verifier.verifyWebhookSignature("payload", null, "secret")).isFalse();
        assertThat(verifier.verifyWebhookSignature("payload", "sig", null)).isFalse();
        assertThat(verifier.verifyWebhookSignature("payload", "sig", " ")).isFalse();
    }
}
