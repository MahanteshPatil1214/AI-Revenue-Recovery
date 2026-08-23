package com.razorpay.recovery.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "dunning_events", indexes = {
        @Index(name = "idx_dunning_payment_id", columnList = "paymentId"),
        @Index(name = "idx_dunning_status_retry", columnList = "status, nextRetryAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DunningEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String paymentId;

    private Double amount;
    private String customerEmail;
    private String customerContact;
    private String errorCode;
    private String errorReason;

    @Enumerated(EnumType.STRING)
    private FailureCategory category;

    private String strategyApplied;

    @Column(length = 1000)
    private String reasoningTrace;

    private String recoveryUrl;

    // Statuses: SCHEDULED, RETRYING, RECOVERED_RETRY_SUCCESS, RECOVERED_ACTION_TAKEN, EXHAUSTED_ESCALATED
    private String status;

    @Builder.Default
    private Integer retryCount = 0;

    @Builder.Default
    private Integer maxRetries = 3;

    private Instant nextRetryAt;

    private Instant createdAt;
}