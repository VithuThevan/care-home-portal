using System.Security.Cryptography;

namespace CareHome.Api.Security;

public static class TemporaryPasswordGenerator
{
    private const string Upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private const string Lower = "abcdefghijkmnopqrstuvwxyz";
    private const string Digits = "23456789";
    private const string Special = "!@#$%*?";
    private const string All = Upper + Lower + Digits + Special;

    public static string Generate(int length = 14)
    {
        length = Math.Max(length, 12);
        var chars = new char[length];
        chars[0] = Pick(Upper);
        chars[1] = Pick(Lower);
        chars[2] = Pick(Digits);
        chars[3] = Pick(Special);
        for (var i = 4; i < length; i++)
        {
            chars[i] = Pick(All);
        }

        return new string(Shuffle(chars));
    }

    private static char Pick(string source)
    {
        return source[RandomNumberGenerator.GetInt32(source.Length)];
    }

    private static char[] Shuffle(char[] chars)
    {
        for (var i = chars.Length - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (chars[i], chars[j]) = (chars[j], chars[i]);
        }

        return chars;
    }
}
