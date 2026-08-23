package com.razorpay.recovery.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "webhook_dlq_events", indexes = {
        @Index(name = "idx_dlq_status_next_retry", columnList = "status, nextRetryAt")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WebhookDlqEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String eventType;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String rawPayload;

    @Column(columnDefinition = "TEXT")
    private String exceptionMessage;

    @Builder.Default
    private Integer retryCount = 0;

    @Builder.Default
    private Integer maxRetries = 3;

    // Status: RETRY_PENDING, RESOLVED, DEAD_LETTER
    @Builder.Default
    private String status = "RETRY_PENDING";

    private Instant nextRetryAt;

    private Instant createdAt;

    private Instant updatedAt;
}
