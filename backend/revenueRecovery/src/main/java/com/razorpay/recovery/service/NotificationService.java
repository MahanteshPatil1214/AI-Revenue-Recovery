package com.razorpay.recovery.service;

import java.math.BigDecimal;

public interface NotificationService {
    void sendEmailRecovery(String customerName, String customerEmail, BigDecimal amount, String currency, String paymentLink, String failureReason);
    void sendSmsOrWhatsAppRecovery(String customerName, String customerPhone, BigDecimal amount, String currency, String paymentLink, String failureReason);
}