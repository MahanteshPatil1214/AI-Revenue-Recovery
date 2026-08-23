package com.razorpay.recovery.controller;


import com.razorpay.recovery.model.DunningEvent;
import com.razorpay.recovery.repository.DunningEventRepository;
import com.razorpay.recovery.service.SseStreamService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/customer")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CustomerRecoveryController {

    private final DunningEventRepository eventRepository;
    private final SseStreamService sseStreamService;

    @GetMapping("/invoice/{paymentId}")
    public ResponseEntity<?> getInvoiceDetails(@PathVariable String paymentId) {
        return eventRepository.findByPaymentId(paymentId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/resolve/{paymentId}")
    public ResponseEntity<?> resolveCustomerPayment(
            @PathVariable String paymentId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        return eventRepository.findByPaymentId(paymentId)
                .map(event -> {
                    String method = body != null ? body.getOrDefault("method", "UPI") : "UPI";
                    event.setStatus("RECOVERED_CUSTOMER_PAID");
                    event.setStrategyApplied("CUSTOMER_1CLICK_CHECKOUT_SUCCESS");
                    event.setReasoningTrace(String.format("Customer clicked recovery email link and settled ₹%.2f via %s gateway authorization.", event.getAmount(), method));
                    event.setNextRetryAt(null);

                    DunningEvent saved = eventRepository.save(event);
                    sseStreamService.broadcast(saved);
                    log.info("Payment {} settled directly by customer via recovery link", paymentId);
                    return ResponseEntity.ok(saved);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
