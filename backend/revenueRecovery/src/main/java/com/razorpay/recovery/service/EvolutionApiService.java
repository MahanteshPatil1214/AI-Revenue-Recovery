package com.razorpay.recovery.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thin client for the open-source Evolution API gateway (self-hosted via Docker).
 *
 * Sends a WhatsApp text message via POST /message/sendText/{instanceName} using the
 * instance (or global) API key. Kept deliberately isolated so the rest of the engine
 * depends only on {@link #sendText(String, String, String)} and can treat the gateway
 * as an opaque outbound channel.
 *
 * Docs: https://docs.evolutionfoundation.com.br/en/evolution-api/send-text-message
 */
@Service
public class EvolutionApiService {

    private static final Logger log = LoggerFactory.getLogger(EvolutionApiService.class);

    private final RestTemplate restTemplate;

    @Value("${evolution.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${evolution.api-key:}")
    private String globalApiKey;

    @Value("${evolution.instance.name:recovery-engine}")
    private String instanceName;

    @Value("${evolution.instance.token:}")
    private String instanceToken;

    public EvolutionApiService() {
        this(new RestTemplate());
    }

    EvolutionApiService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    /**
     * Whether the gateway can be reached / configured. Enabled when the instance name
     * is set and at least one API key is available.
     */
    public boolean isConfigured() {
        return instanceName != null && !instanceName.isBlank()
                && apiKey() != null && !apiKey().isBlank();
    }

    /**
     * Sends a WhatsApp text message to the given phone number (kept as provided, but
     * stripped to digits for the international-format requirement of Evolution API).
     *
     * @return true if the gateway returned a 2xx success, false otherwise
     */
    public boolean sendText(String number, String text) {
        String cleanNumber = normalizeNumber(number);
        if (!isConfigured() || cleanNumber == null) {
            return false;
        }

        Map<String, Object> textMessage = new LinkedHashMap<>();
        textMessage.put("text", text);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("number", cleanNumber);
        body.put("textMessage", textMessage);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("apikey", apiKey());

        String url = baseUrl.replaceAll("/+$", "") + "/message/sendText/" + instanceName;

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(
                    url, new HttpEntity<>(body, headers), String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Evolution API: WhatsApp message dispatched to {} via instance {}", cleanNumber, instanceName);
                return true;
            }
            log.warn("Evolution API returned HTTP {} for number {}", response.getStatusCode(), cleanNumber);
            return false;
        } catch (RestClientException e) {
            log.error("Evolution API dispatch failed for {}: {}", cleanNumber, e.getMessage());
            return false;
        }
    }

    private String apiKey() {
        return (instanceToken != null && !instanceToken.isBlank()) ? instanceToken : globalApiKey;
    }

    private String normalizeNumber(String number) {
        if (number == null) {
            return null;
        }
        String digits = number.replaceAll("[^0-9]", "");
        return digits.isEmpty() ? null : digits;
    }
}
