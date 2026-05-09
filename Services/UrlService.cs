using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

public class UrlService
{
    private static readonly Regex AliasRegex = new("^[a-zA-Z0-9_-]{3,30}$", RegexOptions.Compiled);
    private readonly string _connectionString;
    private const string CodeChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    public UrlService(IConfiguration configuration)
    {
        _connectionString = configuration.GetConnectionString("UrlShortener")
            ?? "Data Source=Data/links.db";

        InitializeDatabase();
    }

    public async Task<(bool IsSuccess, string? ShortCode, string? Error)> CreateShortUrlAsync(string originalUrl, string? customAlias)
    {
        if (!Uri.TryCreate(originalUrl, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps))
        {
            return (false, null, "Please enter a valid http/https URL.");
        }

        string shortCode;
        if (!string.IsNullOrWhiteSpace(customAlias))
        {
            shortCode = customAlias.Trim();
            if (!AliasRegex.IsMatch(shortCode))
            {
                return (false, null, "Custom alias must be 3-30 chars and contain only letters, numbers, '-' or '_'.");
            }
        }
        else
        {
            shortCode = await GenerateUniqueCodeAsync();
        }

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        var command = connection.CreateCommand();
        command.CommandText = """
            INSERT INTO url_mappings (short_code, original_url, created_at_utc)
            VALUES ($shortCode, $originalUrl, $createdAtUtc);
            """;
        command.Parameters.AddWithValue("$shortCode", shortCode);
        command.Parameters.AddWithValue("$originalUrl", originalUrl.Trim());
        command.Parameters.AddWithValue("$createdAtUtc", DateTime.UtcNow.ToString("O"));

        try
        {
            await command.ExecuteNonQueryAsync();
            return (true, shortCode, null);
        }
        catch (SqliteException ex) when (ex.SqliteErrorCode == 19)
        {
            return (false, null, "This alias is already taken. Try another one.");
        }
    }

    public async Task<string?> GetOriginalUrlAsync(string shortCode)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        var command = connection.CreateCommand();
        command.CommandText = """
            SELECT original_url
            FROM url_mappings
            WHERE short_code = $shortCode
            LIMIT 1;
            """;
        command.Parameters.AddWithValue("$shortCode", shortCode);

        var result = await command.ExecuteScalarAsync();
        return result?.ToString();
    }

    public async Task<IReadOnlyList<UrlMapping>> GetRecentLinksAsync(int limit = 5)
    {
        var links = new List<UrlMapping>();

        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        var command = connection.CreateCommand();
        command.CommandText = """
            SELECT id, short_code, original_url, created_at_utc
            FROM url_mappings
            ORDER BY id DESC
            LIMIT $limit;
            """;
        command.Parameters.AddWithValue("$limit", Math.Clamp(limit, 1, 50));

        await using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            var createdAtRaw = reader.GetString(3);
            DateTime.TryParse(createdAtRaw, out var createdAtUtc);

            links.Add(new UrlMapping
            {
                Id = reader.GetInt64(0),
                ShortCode = reader.GetString(1),
                OriginalUrl = reader.GetString(2),
                CreatedAtUtc = createdAtUtc
            });
        }

        return links;
    }

    private void InitializeDatabase()
    {
        var dataSource = new SqliteConnectionStringBuilder(_connectionString).DataSource;
        if (!string.IsNullOrWhiteSpace(dataSource))
        {
            var dbDirectory = Path.GetDirectoryName(dataSource);
            if (!string.IsNullOrWhiteSpace(dbDirectory))
            {
                Directory.CreateDirectory(dbDirectory);
            }
        }

        using var connection = new SqliteConnection(_connectionString);
        connection.Open();

        var command = connection.CreateCommand();
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS url_mappings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                short_code TEXT NOT NULL UNIQUE,
                original_url TEXT NOT NULL,
                created_at_utc TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_url_mappings_short_code ON url_mappings(short_code);
            """;
        command.ExecuteNonQuery();
    }

    private async Task<string> GenerateUniqueCodeAsync()
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var code = GenerateCode();
            if (!await ExistsAsync(code))
            {
                return code;
            }
        }

        return $"{GenerateCode()}{GenerateCode(2)}";
    }

    private async Task<bool> ExistsAsync(string shortCode)
    {
        await using var connection = new SqliteConnection(_connectionString);
        await connection.OpenAsync();

        var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(1) FROM url_mappings WHERE short_code = $shortCode;";
        command.Parameters.AddWithValue("$shortCode", shortCode);

        var count = Convert.ToInt32(await command.ExecuteScalarAsync());
        return count > 0;
    }

    private string GenerateCode(int length = 6)
    {
        var buffer = new char[length];
        for (var i = 0; i < length; i++)
        {
            buffer[i] = CodeChars[RandomNumberGenerator.GetInt32(CodeChars.Length)];
        }

        return new string(buffer);
    }
}
