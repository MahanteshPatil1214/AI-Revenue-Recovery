package com.razorpay.recovery.service;

import com.razorpay.recovery.dto.RecoveryOptionsResponse;
import com.razorpay.recovery.model.DunningEvent;
import com.razorpay.recovery.repository.DunningEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerRecoveryPortalService {

    private final DunningEventRepository eventRepository;
    private final DunningRecoveryService dunningRecoveryService;

    public RecoveryOptionsResponse getRecoveryOptions(String paymentId) {
        DunningEvent event = eventRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new RuntimeException("Dunning record not found for payment: " + paymentId));

        double originalAmount = event.getAmount();
        String contact = event.getCustomerContact() != null ? event.getCustomerContact() : "+919876543210";
        String email = event.getCustomerEmail() != null ? event.getCustomerEmail() : "customer@example.com";

        // 1. Calculate 10% Instant Grace Retention Discount
        double discountedAmount = BigDecimal.valueOf(originalAmount * 0.90)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();
        double discountSavings = BigDecimal.valueOf(originalAmount * 0.10)
                .setScale(2, RoundingMode.HALF_UP)
                .doubleValue();

        // 2. Original payment link (already exists or generate new one)
        String originalUrl = (event.getRecoveryUrl() != null && !event.getRecoveryUrl().isBlank())
                ? event.getRecoveryUrl()
                : generateRazorpayLink(originalAmount, contact, email, paymentId, "Standard Renewal");

        // 3. Discounted payment link via Razorpay API
        String discountedUrl = generateRazorpayLink(discountedAmount, contact, email, paymentId, "10% Grace Discount");

        return RecoveryOptionsResponse.builder()
                .paymentId(paymentId)
                .customerEmail(event.getCustomerEmail())
                .originalAmount(originalAmount)
                .currency("INR")
                .failureReason(event.getErrorReason() != null ? event.getErrorReason() : "Declined by issuing bank")
                .originalPaymentUrl(originalUrl)
                .discountedAmount(discountedAmount)
                .discountSavings(discountSavings)
                .discountedPaymentUrl(discountedUrl)
                .build();
    }

    private String generateRazorpayLink(double amount, String contact, String email, String paymentId, String description) {
        long amountInPaise = BigDecimal.valueOf(amount)
                .multiply(BigDecimal.valueOf(100))
                .longValue();
        try {
            return dunningRecoveryService.generatePaymentLink(amountInPaise, contact, email, paymentId + "_" + description.replaceAll("\\s+", "_"));
        } catch (Exception e) {
            log.warn("Failed to generate Razorpay link for {} ({}): {}", paymentId, description, e.getMessage());
            return "#";
        }
    }
}