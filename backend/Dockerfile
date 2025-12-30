FROM golang:1.21-alpine AS builder

# Install build dependencies for CGO
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -o backend .

FROM alpine:latest

RUN apk --no-cache add ca-certificates wget

WORKDIR /app

RUN mkdir -p /app/data

COPY --from=builder /app/backend .

EXPOSE 8080

CMD ["./backend"]
