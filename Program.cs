var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddSingleton<UrlService>();
var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

//app.UseHttpsRedirection();

app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();
app.MapRazorPages()
   .WithStaticAssets();


app.MapPost("/shorten", async (ShortenRequest request, UrlService service, HttpContext context) =>
{
    var (isSuccess, shortCode, error) = await service.CreateShortUrlAsync(request.Url, request.Alias);

    if (!isSuccess || string.IsNullOrWhiteSpace(shortCode))
    {
        return Results.BadRequest(new { message = error ?? "Unable to shorten this URL." });
    }

    var shortUrl = $"{context.Request.Scheme}://{context.Request.Host}/{shortCode}";
    return Results.Ok(new { shortUrl, shortCode });
});

app.MapGet("/api/links/recent", async (UrlService service, HttpContext context) =>
{
    var links = await service.GetRecentLinksAsync(5);
    var hostBase = $"{context.Request.Scheme}://{context.Request.Host}";

    var response = links.Select(link => new
    {
        link.Id,
        link.ShortCode,
        link.OriginalUrl,
        link.CreatedAtUtc,
        ShortUrl = $"{hostBase}/{link.ShortCode}"
    });

    return Results.Ok(response);
});

app.MapGet("/{code}", async (string code, UrlService service) =>
{
    var originalUrl = await service.GetOriginalUrlAsync(code);
    if (string.IsNullOrWhiteSpace(originalUrl))
    {
        return Results.NotFound("URL not found");
    }

    return Results.Redirect(originalUrl);
});
app.Run();

public sealed record ShortenRequest(string Url, string? Alias);
