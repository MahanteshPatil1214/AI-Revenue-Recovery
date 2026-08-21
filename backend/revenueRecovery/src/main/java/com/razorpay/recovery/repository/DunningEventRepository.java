package com.razorpay.recovery.repository;

import com.razorpay.recovery.model.DunningEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DunningEventRepository extends JpaRepository<DunningEvent, Long> {
    Optional<DunningEvent> findByPaymentId(String paymentId);
    boolean existsByPaymentId(String paymentId);
}
