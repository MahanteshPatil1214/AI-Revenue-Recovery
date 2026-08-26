package com.razorpay.recovery.controller;

import com.razorpay.recovery.dto.RecoveryOptionsResponse;
import com.razorpay.recovery.model.DunningEvent;
import com.razorpay.recovery.repository.DunningEventRepository;
import com.razorpay.recovery.service.CustomerRecoveryPortalService;
import com.razorpay.recovery.service.SseStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.regex.Pattern;

@Slf4j
@RestController
@RequestMapping("/api/v1/customer")
@RequiredArgsConstructor
public class CustomerRecoveryController {

    private static final Pattern PAYMENT_ID_PATTERN = Pattern.compile("^pay_[a-zA-Z0-9_\\-]{1,64}$");

    private final DunningEventRepository eventRepository;
    private final SseStreamService sseStreamService;
    private final CustomerRecoveryPortalService portalService;

    @GetMapping("/options/{paymentId}")
    public ResponseEntity<?> getRecoveryOptions(@PathVariable String paymentId) {
        if (paymentId == null || paymentId.isBlank() || paymentId.length() > 64) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid payment ID"));
        }
        try {
            RecoveryOptionsResponse options = portalService.getRecoveryOptions(paymentId);
            return ResponseEntity.ok(options);
        } catch (Exception e) {
            log.error("Failed to load options for payment {}: {}", paymentId, e.getMessage());
            return ResponseEntity.status(404).body(Map.of("error", "Dunning record not found"));
        }
    }

    @GetMapping("/invoice/{paymentId}")
    public ResponseEntity<?> getInvoiceDetails(@PathVariable String paymentId) {
        if (paymentId == null || paymentId.isBlank() || paymentId.length() > 64) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid payment ID"));
        }
        return eventRepository.findByPaymentId(paymentId)
                .map(event -> {
                    DunningEvent safe = DunningEvent.builder()
                            .paymentId(event.getPaymentId())
                            .amount(event.getAmount())
                            .customerEmail(event.getCustomerEmail())
                            .customerContact(event.getCustomerContact())
                            .errorCode(event.getErrorCode())
                            .errorReason(event.getErrorReason())
                            .category(event.getCategory())
                            .status(event.getStatus())
                            .recoveryUrl(event.getRecoveryUrl())
                            .createdAt(event.getCreatedAt())
                            .build();
                    return ResponseEntity.ok((Object) safe);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/resolve/{paymentId}")
    public ResponseEntity<?> resolveCustomerPayment(
            @PathVariable String paymentId,
            @RequestBody(required = false) Map<String, Object> body
    ) {
        if (paymentId == null || paymentId.isBlank() || paymentId.length() > 64) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid payment ID"));
        }
        return eventRepository.findByPaymentId(paymentId)
                .map(event -> {
                    String method = (body != null && body.containsKey("method"))
                            ? body.get("method").toString()
                            : "1-Click Recovery";

                    event.setStatus("RECOVERED_CUSTOMER_PAID");
                    event.setStrategyApplied("CUSTOMER_1CLICK_CHECKOUT_SUCCESS");
                    event.setReasoningTrace(String.format("Settled via %s checkout offer.", method));
                    event.setNextRetryAt(null);

                    DunningEvent saved = eventRepository.save(event);
                    sseStreamService.broadcast(saved);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}