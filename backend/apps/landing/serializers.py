from rest_framework import serializers

from .models import LandingSection, LandingSectionVersion, LandingMedia

ALLOWED_BLOCK_TYPES = {
    'hero', 'rich_text', 'stats', 'features', 'programs',
    'logos', 'gallery', 'video', 'testimonials',
    'cta', 'faq', 'team', 'image', 'embed', 'contact',
}


class LandingSectionSerializer(serializers.ModelSerializer):
    """Management serializer — exposes draft content and publish controls."""
    published_content = serializers.JSONField(read_only=True)
    updated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LandingSection
        fields = [
            'id', 'key', 'title', 'description', 'content', 'theme', 'status',
            'published_version', 'published_content', 'sort_order',
            'updated_by', 'updated_by_name', 'created_at', 'updated_at',
        ]
        read_only_fields = ['status', 'published_version', 'published_content', 'updated_by']

    def validate_theme(self, value):
        if value is None:
            return {}
        if not isinstance(value, dict):
            raise serializers.ValidationError('theme must be an object')
        allowed = {'accent', 'background', 'padding', 'align', 'buttonStyle'}
        unknown = set(value.keys()) - allowed
        if unknown:
            raise serializers.ValidationError(
                f'unknown theme keys: {", ".join(sorted(unknown))}'
            )
        return value

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return obj.updated_by.get_full_name() or obj.updated_by.email
        return None

    def validate_content(self, value):
        if value is None:
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError('content must be a list of blocks')
        for i, block in enumerate(value):
            if not isinstance(block, dict):
                raise serializers.ValidationError(f'block {i}: must be an object')
            btype = block.get('type')
            if btype not in ALLOWED_BLOCK_TYPES:
                raise serializers.ValidationError(
                    f'block {i}: unknown type "{btype}" (allowed: {", ".join(sorted(ALLOWED_BLOCK_TYPES))})'
                )
            if not isinstance(block.get('data', {}), dict):
                raise serializers.ValidationError(f'block {i}: "data" must be an object')
        return value


class PublicLandingSectionSerializer(serializers.ModelSerializer):
    """Public serializer — serves only published content, no auth."""
    content = serializers.JSONField(source='published_content', read_only=True)

    class Meta:
        model = LandingSection
        fields = ['id', 'key', 'title', 'content', 'theme', 'sort_order', 'published_version']


class LandingSectionVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LandingSectionVersion
        fields = ['id', 'version', 'content', 'theme', 'created_by_name', 'created_at']
        read_only_fields = fields

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None


class LandingMediaSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = LandingMedia
        fields = ['id', 'name', 'file_key', 'mime_type', 'file_size', 'alt_text', 'url', 'created_at']
        read_only_fields = ['file_key', 'mime_type', 'file_size', 'uploaded_by', 'url']

    def get_url(self, obj):
        return f'/api/landing/media/{obj.file_key}'
