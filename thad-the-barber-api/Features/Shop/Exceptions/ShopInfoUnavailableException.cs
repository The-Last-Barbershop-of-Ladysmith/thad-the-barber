using ThadTheBarber.Api.Common.Exceptions;

namespace ThadTheBarber.Api.Features.Shop.Exceptions;

/// <summary>The shop info file couldn't be read, or isn't valid JSON, or couldn't be saved, so the admin is told rather than shown defaults.</summary>
public sealed class ShopInfoUnavailableException(string message, Exception? innerException)
    : ProblemException(
        StatusCodes.Status503ServiceUnavailable,
        "shop_info_unavailable",
        "The shop info couldn't be reached.",
        message,
        innerException
    );
