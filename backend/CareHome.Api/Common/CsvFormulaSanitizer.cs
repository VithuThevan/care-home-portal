namespace CareHome.Api.Common;

public static class CsvFormulaSanitizer
{
    public static string Neutralize(string? value)
    {
        var text = value ?? string.Empty;
        if (text.Length == 0)
        {
            return text;
        }

        var first = text[0];
        if (first is '=' or '+' or '-' or '@' or '\t' or '\r')
        {
            return "'" + text;
        }

        return text;
    }

    public static string CsvField(string? value, bool neutralizeFormula = true)
    {
        var text = neutralizeFormula ? Neutralize(value) : value ?? string.Empty;
        if (text.Contains(',') || text.Contains('"') || text.Contains('\n') || text.Contains('\r'))
        {
            return $"\"{text.Replace("\"", "\"\"")}\"";
        }

        return text;
    }
}
