package com.razorpay.recovery.controller;


import com.razorpay.recovery.model.DunningEvent;
import com.razorpay.recovery.repository.DunningEventRepository;
import com.razorpay.recovery.service.SseStreamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/v1/stream")
@RequiredArgsConstructor
public class SseController {

    private final SseStreamService sseStreamService;
    private final DunningEventRepository eventRepository;

    @GetMapping(value = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents() {
        return sseStreamService.subscribe();
    }

    @GetMapping("/history")
    public List<DunningEvent> getHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {
        return eventRepository.findTop100ByOrderByCreatedAtDesc();
    }
}
