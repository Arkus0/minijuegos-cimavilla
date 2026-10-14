using System;
using System.IO;
using System.Text.Json;
using Cimavilla.CostaVerde.Tests;

var options = new JsonSerializerOptions { IncludeFields = true };
var path = args.Length > 0 ? args[0] : "unity/Packages/com.cimavilla.costa-verde/Tests/Fixtures/web-parity.json";
var golden = JsonSerializer.Deserialize<GoldenFile>(File.ReadAllText(path), options);
int count = CoreChecks.Parity(golden, s => JsonSerializer.Serialize(s, options));
CoreChecks.Lifecycle();
Console.WriteLine($"PASS: {count} web/C# checkpoints; session closure, pause, saves, payouts and local reel clock.");
