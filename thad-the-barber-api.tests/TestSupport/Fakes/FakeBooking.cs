using ThadTheBarber.Api.Square.Models;

namespace ThadTheBarber.Api.Tests.TestSupport.Fakes;

public sealed record FakeBooking(
    string CustomerId,
    TimeSlot TimeSlot,
    string IdempotencyKey,
    Appointment Appointment
);
