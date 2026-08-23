package com.razorpay.recovery.repository;


import com.razorpay.recovery.model.WebhookDlqEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface WebhookDlqRepository extends JpaRepository<WebhookDlqEvent, Long> {

    @Query("SELECT d FROM WebhookDlqEvent d WHERE d.status = 'RETRY_PENDING' AND d.nextRetryAt <= :now ORDER BY d.nextRetryAt ASC")
    List<WebhookDlqEvent> findPendingRetriesReady(@Param("now") Instant now);
}
