package com.razorpay.recovery.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Persistent audit trail of every Razorpay webhook received.
 * Written BEFORE processing so that no webhook is ever lost, even if
 * downstream processing crashes. Enables reconciliation and DLQ debugging.
 */
@Entity
@Table(name = "webhook_event_log", indexes = {
        @Index(name = "idx_wehook_event_type_created", columnList = "eventType, createdAt"),
        @Index(name = "idx_wehook_payment_id", columnList = "paymentId")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookEventLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String eventType;

    private String paymentId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String rawPayload;

    // Status: RECEIVED, PROCESSING, PROCESSED, FAILED, DUPLICATE, UNHANDLED
    @Builder.Default
    private String status = "RECEIVED";

    @Column(columnDefinition = "TEXT")
    private String processingNote;

    private Instant createdAt;

    private Instant processedAt;
}
