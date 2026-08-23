package com.razorpay.recovery.repository;

import com.razorpay.recovery.model.DunningEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface DunningEventRepository extends JpaRepository<DunningEvent, Long> {
    Optional<DunningEvent> findByPaymentId(String paymentId);
    boolean existsByPaymentId(String paymentId);

    @Query("SELECT e FROM DunningEvent e WHERE e.status = 'SCHEDULED' AND e.nextRetryAt <= :now ORDER BY e.nextRetryAt ASC")
    List<DunningEvent> findPendingRetriesReady(@Param("now") Instant now);
}
