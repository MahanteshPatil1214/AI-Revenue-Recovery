package com.razorpay.recovery;

import com.razorpay.recovery.controller.SignatureVerifier;
import com.razorpay.recovery.controller.WebhookController;
import com.razorpay.recovery.model.WebhookEventLog;
import com.razorpay.recovery.service.WebhookDlqService;
import com.razorpay.recovery.service.WebhookIngestionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test for the real Razorpay webhook HTTP contract.
 *
 * Exercises the full MVC layer ("real" signature verification + payload guards)
 * with the persistence/side-effect collaborators mocked, so the webhook security
 * and response contract is verified without needing a live Postgres in CI.
 */
@WebMvcTest(WebhookController.class)
@Import(SignatureVerifier.class)
@TestPropertySource(properties = "razorpay.webhook.secret=test_webhook_secret_123")
class WebhookControllerIntegrationTest {

    private static final String SECRET = "test_webhook_secret_123";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private WebhookIngestionService ingestionService;

    @MockBean
    private WebhookDlqService webhookDlqService;

    private static String hmac(String payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        StringBuilder hex = new StringBuilder();
        for (byte b : mac.doFinal(payload.getBytes(StandardCharsets.UTF_8))) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }

    private static final String VALID_PAYLOAD =
            "{\"event\":\"payment.failed\",\"payload\":{\"payment\":{\"entity\":{\"id\":\"pay_int_1\"}}}}";

    @Test
    void validSignatureReturnsOk() throws Exception {
        WebhookEventLog logEntry = WebhookEventLog.builder().eventType("payment.failed").build();
        when(ingestionService.recordInbound(anyString(), anyString(), anyString())).thenReturn(logEntry);

        mockMvc.perform(post("/api/v1/webhook/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", hmac(VALID_PAYLOAD))
                        .content(VALID_PAYLOAD))
                .andExpect(status().isOk())
                .andExpect(content().string("Event processed successfully"));
    }

    @Test
    void invalidSignatureReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/webhook/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", "deadbeef")
                        .content(VALID_PAYLOAD))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("Invalid signature"));
    }

    @Test
    void missingSignatureReturnsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/v1/webhook/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_PAYLOAD))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void blankPayloadReturnsBadRequest() throws Exception {
        // Whitespace-only body binds as a String, then trips the controller's blank guard (400).
        mockMvc.perform(post("/api/v1/webhook/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", hmac(" "))
                        .content(" "))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Empty webhook payload"));
    }

    @Test
    void processingFailureCapturesToDlqAndReturnsAccepted() throws Exception {
        // Valid signature + valid payload, but ingestion blows up => DLQ capture -> 202
        when(ingestionService.recordInbound(anyString(), anyString(), anyString())).thenReturn(
                WebhookEventLog.builder().build());
        doThrow(new RuntimeException("boom")).when(ingestionService).process(anyString(), anyString());

        mockMvc.perform(post("/api/v1/webhook/razorpay")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("X-Razorpay-Signature", hmac(VALID_PAYLOAD))
                        .content(VALID_PAYLOAD))
                .andExpect(status().isAccepted())
                .andExpect(content().string("Payload queued in Dead-Letter Queue for retry"));
    }
}
