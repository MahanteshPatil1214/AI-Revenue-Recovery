# Build stage: compile the Spring Boot fat jar with Maven (Java 21)
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml .
COPY src ./src
RUN mvn -B -ntp clean package -DskipTests \
    -Dmaven.wagon.http.retryHandler.count=3 \
    -Dmaven.wagon.httpconnectionManager.ttlSeconds=120

# Runtime stage: only need a JRE + the jar
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /build/target/revenue-recovery-engine-1.0.0.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
