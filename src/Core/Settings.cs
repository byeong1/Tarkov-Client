using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace TarkovClient
{
    class Settings
    {
        const string SETTINGS_FILE_PATH = "settings.json";

        public static void Save()
        {
            AppSettings settings = Env.GetSettings();

            var json = JsonSerializer.Serialize(
                settings,
                new JsonSerializerOptions { WriteIndented = true }
            );
            File.WriteAllText(SETTINGS_FILE_PATH, json);
        }

        public static void Load()
        {
            if (!File.Exists(SETTINGS_FILE_PATH))
                return;

            try
            {
                var json = File.ReadAllText(SETTINGS_FILE_PATH);
                var settings = JsonSerializer.Deserialize<AppSettings>(json);

                Env.SetSettings(settings);
            }
            catch (Exception) { }
        }

        public static void Delete()
        {
            try
            {
                if (!File.Exists(SETTINGS_FILE_PATH))
                    return;

                File.Delete(SETTINGS_FILE_PATH);
            }
            catch (Exception) { }
        }
    }
}
