package com.razorpay.recovery.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class RecoveryOptionsResponse {
    private String paymentId;
    private String customerEmail;
    private double originalAmount;
    private String currency;
    private String failureReason;

    // 1. Standard full-price link
    private String originalPaymentUrl;

    // 2. Discounted offer link (10% OFF)
    private double discountedAmount;
    private double discountSavings;
    private String discountedPaymentUrl;

    // 3. Plan downgrade link (Switch to monthly)
    private boolean eligibleForMonthlyDowngrade;
    private double monthlyAmount;
    private String monthlyPaymentUrl;
}