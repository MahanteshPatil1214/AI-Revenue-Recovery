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

    List<DunningEvent> findTop100ByOrderByCreatedAtDesc();

    List<DunningEvent> findByStatusAndNextRetryAtLessThanEqualOrderByNextRetryAtAsc(String status, Instant timestamp);

    // Dynamic count of total events for a bank rail in a time window
    @Query("SELECT COUNT(e) FROM DunningEvent e WHERE (UPPER(e.errorCode) LIKE %:bank% OR UPPER(e.errorReason) LIKE %:bank%) AND e.createdAt >= :since")
    long countBankEventsSince(@Param("bank") String bank, @Param("since") Instant since);

    // Dynamic count of soft/gateway failures for that bank rail in the same window
    @Query("SELECT COUNT(e) FROM DunningEvent e WHERE (UPPER(e.errorCode) LIKE %:bank% OR UPPER(e.errorReason) LIKE %:bank%) AND e.category = com.razorpay.recovery.model.FailureCategory.TRANSIENT_SOFT_FAIL AND e.createdAt >= :since")
    long countBankFailuresSince(@Param("bank") String bank, @Param("since") Instant since);

}