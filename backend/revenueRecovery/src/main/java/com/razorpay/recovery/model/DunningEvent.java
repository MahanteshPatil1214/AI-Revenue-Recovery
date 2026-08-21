package com.razorpay.recovery.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "dunning_events")
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
    private String status; // SCHEDULED, RECOVERED_ACTION_TAKEN, RESOLVED
    private Instant createdAt;
}
