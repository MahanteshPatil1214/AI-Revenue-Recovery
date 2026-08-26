package com.razorpay.recovery.controller;

import com.razorpay.recovery.service.BankHealthRadarService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/radar")
@RequiredArgsConstructor
@Profile("dev")
public class RadarController {

    private final BankHealthRadarService radarService;

    @GetMapping("/status")
    public ResponseEntity<Map<String, BankHealthRadarService.BankHealthMetrics>> getRadarStatus() {
        return ResponseEntity.ok(radarService.getAllBankStatuses());
    }


    @PostMapping("/restore")
    public ResponseEntity<String> restoreHealth(@RequestParam(defaultValue = "HDFC") String bank) {
        radarService.restoreBankHealth(bank);
        return ResponseEntity.ok("Telemetry restored for " + bank);
    }

    @PostMapping("/simulate-outage")
    public ResponseEntity<String> simulateOutage(
            @RequestParam(defaultValue = "HDFC") String bank,
            @RequestParam(defaultValue = "75.0") double rate) {
        radarService.injectSimulatedDowntime(bank, rate);
        return ResponseEntity.ok(String.format("Simulated anomaly (%.1f%%) injected for %s", rate, bank));
    }
}