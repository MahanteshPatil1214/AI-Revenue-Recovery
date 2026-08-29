package com.razorpay.recovery;

import com.razorpay.recovery.controller.TestSimulationController;
import com.razorpay.recovery.model.DunningEvent;
import com.razorpay.recovery.repository.DunningEventRepository;
import com.razorpay.recovery.service.DunningRecoveryService;
import com.razorpay.recovery.service.WebhookDlqService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TestSimulationControllerTest {

    @Mock
    private WebhookDlqService webhookDlqService;

    @Mock
    private DunningRecoveryService dunningService;

    @Mock
    private DunningEventRepository eventRepository;

    private TestSimulationController controller() {
        return new TestSimulationController(webhookDlqService, dunningService, eventRepository);
    }

    @Test
    void resetClearsExistingRecordsWithoutSeeding() {
        ResponseEntity<Map<String, Object>> res = controller().resetDemo(false);

        verify(eventRepository, times(1)).deleteAll();
        assertThat(res.getStatusCodeValue()).isEqualTo(200);
        assertThat(res.getBody().get("cleared")).isEqualTo(true);
        assertThat(res.getBody().get("seeded")).isEqualTo(0);
    }

    @Test
    void resetWithSeedPersistsSixDemoRecords() {
        AtomicInteger saved = new AtomicInteger(0);
        when(eventRepository.save(any(DunningEvent.class))).thenAnswer(inv -> {
            saved.incrementAndGet();
            return inv.getArgument(0);
        });
        when(eventRepository.count()).thenReturn(6L);

        ResponseEntity<Map<String, Object>> res = controller().resetDemo(true);

        verify(eventRepository, times(1)).deleteAll();
        verify(eventRepository, times(6)).save(any(DunningEvent.class));
        assertThat(saved.get()).isEqualTo(6);
        assertThat(res.getBody().get("seeded")).isEqualTo(6);
        assertThat(res.getBody().get("total")).isEqualTo(6L);
    }
}
