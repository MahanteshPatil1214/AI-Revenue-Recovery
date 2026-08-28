package com.razorpay.recovery.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EvolutionApiServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private EvolutionApiService service;

    @BeforeEach
    void setUp() {
        service = new EvolutionApiService(restTemplate);
        ReflectionTestUtils.setField(service, "baseUrl", "http://localhost:8080");
        ReflectionTestUtils.setField(service, "globalApiKey", "secret-key");
        ReflectionTestUtils.setField(service, "instanceToken", "");
        ReflectionTestUtils.setField(service, "instanceName", "recovery-engine");
    }

    @Test
    void isConfiguredWhenKeyAndInstancePresent() {
        assertThat(service.isConfigured()).isTrue();
    }

    @Test
    void notConfiguredWithBlankKey() {
        ReflectionTestUtils.setField(service, "globalApiKey", "");
        assertThat(service.isConfigured()).isFalse();
    }

    @Test
    void notConfiguredWithBlankInstance() {
        ReflectionTestUtils.setField(service, "instanceName", " ");
        assertThat(service.isConfigured()).isFalse();
    }

    @Test
    void sendTextPostsCorrectPayloadAndHeaders() {
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), any(Class.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        boolean sent = service.sendText("+91 90000-00000", "Hello, complete your payment here");

        assertThat(sent).isTrue();

        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<HttpEntity> bodyCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(urlCaptor.capture(), bodyCaptor.capture(), any(Class.class));

        assertThat(urlCaptor.getValue()).isEqualTo("http://localhost:8080/message/sendText/recovery-engine");
        assertThat(bodyCaptor.getValue().getHeaders().getFirst("apikey")).isEqualTo("secret-key");

        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) bodyCaptor.getValue().getBody();
        assertThat(payload).containsEntry("number", "919000000000");
        assertThat(payload).containsKey("textMessage");
    }

    @Test
    void sendTextUsesInstanceSpecificTokenOverGlobalKey() {
        ReflectionTestUtils.setField(service, "instanceToken", "instance-token");
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), any(Class.class)))
                .thenReturn(ResponseEntity.ok("{}"));

        service.sendText("5511999999999", "msg");

        ArgumentCaptor<HttpEntity> bodyCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).postForEntity(anyString(), bodyCaptor.capture(), any(Class.class));
        assertThat(bodyCaptor.getValue().getHeaders().getFirst("apikey")).isEqualTo("instance-token");
    }

    @Test
    void sendTextReturnsFalseOnNon2xx() {
        when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), any(Class.class)))
                .thenReturn(ResponseEntity.status(HttpStatus.BAD_REQUEST).body("{}"));
        assertThat(service.sendText("5511999999999", "msg")).isFalse();
    }

    @Test
    void sendTextReturnsFalseWhenNotConfigured() {
        ReflectionTestUtils.setField(service, "globalApiKey", "");
        assertThat(service.sendText("5511999999999", "msg")).isFalse();
    }

    @Test
    void sendTextReturnsFalseForBlankNumber() {
        ReflectionTestUtils.setField(service, "globalApiKey", "secret-key");
        assertThat(service.sendText("   ", "msg")).isFalse();
    }
}
