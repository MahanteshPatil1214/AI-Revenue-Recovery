package com.razorpay.recovery;

import com.razorpay.recovery.config.AdminAuthInterceptor;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.PrintWriter;
import java.io.StringWriter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAuthInterceptorTest {

    @Mock
    private HttpServletRequest request;
    @Mock
    private HttpServletResponse response;

    private AdminAuthInterceptor interceptor() {
        AdminAuthInterceptor i = new AdminAuthInterceptor();
        ReflectionTestUtils.setField(i, "adminApiKey", "topsecret");
        return i;
    }

    @Test
    void openWhenNoKeyConfigured() throws Exception {
        AdminAuthInterceptor i = new AdminAuthInterceptor();
        ReflectionTestUtils.setField(i, "adminApiKey", "");
        assertThat(i.preHandle(request, response, null)).isTrue();
    }

    @Test
    void rejectsMissingHeader() throws Exception {
        when(request.getHeader("X-Admin-Key")).thenReturn(null);
        when(request.getRequestURI()).thenReturn("/api/v1/admin/analytics");
        StringWriter sw = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(sw));

        AdminAuthInterceptor i = interceptor();
        assertThat(i.preHandle(request, response, null)).isFalse();
        verify(response).setStatus(401);
        assertThat(sw.toString()).contains("X-Admin-Key");
    }

    @Test
    void rejectsWrongKey() throws Exception {
        when(request.getHeader("X-Admin-Key")).thenReturn("wrong");
        when(request.getRequestURI()).thenReturn("/api/v1/admin/analytics");
        StringWriter sw = new StringWriter();
        when(response.getWriter()).thenReturn(new PrintWriter(sw));

        AdminAuthInterceptor i = interceptor();
        assertThat(i.preHandle(request, response, null)).isFalse();
        verify(response).setStatus(401);
    }

    @Test
    void acceptsCorrectKey() throws Exception {
        when(request.getHeader("X-Admin-Key")).thenReturn("topsecret");
        assertThat(interceptor().preHandle(request, response, null)).isTrue();
    }
}
