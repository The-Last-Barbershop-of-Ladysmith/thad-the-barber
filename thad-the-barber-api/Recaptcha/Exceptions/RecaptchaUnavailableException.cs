namespace ThadTheBarber.Api.Recaptcha.Exceptions;

/// <summary>Google couldn't assess the token: unreachable, too slow, refused the request or answered nonsense.</summary>
public sealed class RecaptchaUnavailableException(string message, Exception innerException)
    : Exception(message, innerException);
